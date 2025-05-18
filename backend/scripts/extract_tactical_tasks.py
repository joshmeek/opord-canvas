import fitz  # PyMuPDF
import re
import os
import sys
import logging
import google.generativeai as genai
import json # For parsing Gemini's JSON output
from typing import List, Dict, Optional, Tuple
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(module)s - %(funcName)s - L%(lineno)d - %(message)s'
)
logger = logging.getLogger(__name__)

backend_root_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root_path)) # Insert at the beginning to ensure it's checked first

from app.models.tactical_task import TacticalTask
from app.models.schemas import TacticalTaskCreate
from db.database import Base

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")
genai.configure(api_key=GOOGLE_API_KEY)

EMBEDDING_MODEL_NAME = "models/embedding-001" # Standard Gemini embedding model

# Initialize a generative model for task extraction
TEXT_GENERATION_MODEL_NAME = "gemini-2.0-flash" # Or another suitable generative model
generative_model = genai.GenerativeModel(TEXT_GENERATION_MODEL_NAME)

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using Gemini's embedding model."""
    target_dimension = 1536 
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL_NAME,
            content=text,
            task_type="RETRIEVAL_DOCUMENT"
        )
        embedding_list = result['embedding']
        current_dimension = len(embedding_list)
        if current_dimension != target_dimension:
            logger.warning(
                f"Embedding dimension mismatch for model {EMBEDDING_MODEL_NAME}. "
                f"Native: {current_dimension}, Target: {target_dimension}. Padding/truncating."
            )
            if current_dimension > target_dimension:
                embedding_list = embedding_list[:target_dimension]
            else:
                embedding_list.extend([0.0] * (target_dimension - current_dimension))
        return embedding_list
    except Exception as e:
        logger.error(f"Error generating embedding with {EMBEDDING_MODEL_NAME} for text '{text[:50]}...': {e}")
        return [0.0] * target_dimension

def extract_tasks_with_gemini(page_text: str, physical_page_number: int) -> List[Dict]:
    """
    Extracts tactical tasks, definitions, figure references, and the document's internal page number from page text using Gemini.
    """
    prompt = f"""You are an expert military doctrine analyst. From the following text, extracted from a page of a military field manual (FM 3-90), please identify all distinct tactical tasks.

This text is from physical PDF page number: {physical_page_number}.

For each tactical task, provide:
1. Its name (e.g., "SEIZE", "OCCUPY").
2. Its full definition.
3. A list of any explicit figure references (e.g., ["Figure B-1", "Figure B-23"]) mentioned in its definition or closely associated text. If none, use an empty list.
4. The document's internal page number string as it appears on the page or is most relevant to this task (e.g., "B-11", "A-5", "C-10"). If not clearly discernible for a specific task, use the most prominent page number on the physical page.

Input Text:
---
{page_text}
---

Output the results as a JSON list of objects. Each object in the list should represent a single tactical task and have the following keys:
- "name": The tactical task name.
- "definition": The full definition of the task.
- "figure_references": A list of strings for figure references.
- "document_page_number": The extracted page number string from the document (e.g., "B-11").

If no tactical tasks are found on this page, return an empty JSON list: [].

Example of a single task object:
{{
  "name": "TASK NAME IN ALL CAPS",
  "definition": "The full definition of the task as found in the text.",
  "figure_references": ["Figure X-Y", "Figure Z-A"],
  "document_page_number": "B-12"
}}
"""
    try:
        logger.debug(f"Sending text from physical PDF page {physical_page_number} to Gemini for task extraction. Text length: {len(page_text)} chars.")
        response = generative_model.generate_content(prompt)
        
        cleaned_response_text = response.text.strip()
        if cleaned_response_text.startswith("```json"):
            cleaned_response_text = cleaned_response_text[7:]
        elif cleaned_response_text.startswith("```"):
            cleaned_response_text = cleaned_response_text[3:]
        if cleaned_response_text.endswith("```"):
            cleaned_response_text = cleaned_response_text[:-3]
        
        logger.debug(f"Gemini response for physical PDF page {physical_page_number} (cleaned): {cleaned_response_text[:500]}...")
        
        extracted_tasks = json.loads(cleaned_response_text)
        if not isinstance(extracted_tasks, list):
            logger.warning(f"Gemini did not return a list for physical PDF page {physical_page_number}. Response: {cleaned_response_text}")
            return []
        
        valid_tasks = []
        for task in extracted_tasks:
            if isinstance(task, dict) and all(k in task for k in ["name", "definition", "figure_references", "document_page_number"]):
                valid_tasks.append(task)
            else:
                logger.warning(f"Invalid task structure from Gemini for physical PDF page {physical_page_number}: {task}")
        return valid_tasks
        
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from Gemini response for physical PDF page {physical_page_number}: {e}. Response text: {response.text[:500]}...")
        return []
    except Exception as e:
        logger.error(f"Error calling Gemini API or processing response for physical PDF page {physical_page_number}: {e}")
        return []

def extract_and_save_image(page, figure_ref: str, local_output_dir: Path) -> Optional[str]:
    """Extract and save an image to local_output_dir, returns a public-facing DB path."""
    try:
        local_output_dir.mkdir(parents=True, exist_ok=True)
        image_list = page.get_images(full=True)
        if not image_list:
            return None
            
        for img_index, img_info in enumerate(image_list):
            xref = img_info[0]
            base_image = page.parent.extract_image(xref)
            if base_image:
                sane_figure_ref = re.sub(r'[^a-zA-Z0-9_-]', '', figure_ref.replace(' ', '_')).lower()
                local_filename = f"{sane_figure_ref}_pdfpage{page.number}_{img_index}.{base_image['ext']}"
                local_image_path = local_output_dir / local_filename
                
                with open(local_image_path, "wb") as f:
                    f.write(base_image["image"])
                logger.info(f"Saved image locally: {local_image_path} for figure reference {figure_ref} on PDF page {page.number}")
                
                # Construct the public-facing path for the database, e.g., public/task_images/...
                public_facing_path = Path("public") / "task_images" / local_filename
                return str(public_facing_path)

        logger.debug(f"No suitable image found for figure_ref '{figure_ref}' on PDF page {page.number}")
                
    except Exception as e:
        logger.error(f"Error extracting image for {figure_ref} on PDF page {page.number}: {e}")
    return None

def process_page(page, pdf_page_number: int, local_image_output_dir: Path) -> List[Dict]:
    """Process a single page: extract tasks with Gemini, prepare data for DB."""
    page_text = page.get_text("text", sort=True)
    if not page_text.strip():
        logger.info(f"PDF Page {pdf_page_number} is empty or has no text.")
        return []

    logger.info(f"Processing PDF Page {pdf_page_number} with Gemini.")
    
    gemini_tasks = extract_tasks_with_gemini(page_text, pdf_page_number)
    
    processed_tasks_for_db = []
    if not gemini_tasks:
        logger.info(f"No tasks returned by Gemini for PDF page {pdf_page_number}.")
        return []

    for task_info in gemini_tasks:
        name = task_info.get("name")
        definition = task_info.get("definition")
        figure_references = task_info.get("figure_references", [])
        document_page_number = task_info.get("document_page_number") # LLM-extracted page number

        if not name or not definition or not document_page_number:
            logger.warning(f"Gemini task missing name, definition, or document_page_number on PDF page {pdf_page_number}: {task_info}")
            continue

        logger.info(f"Gemini extracted task: '{name}' on PDF page {pdf_page_number} (Doc Page: {document_page_number}).")

        embedding = generate_embedding(definition)
        
        task_db_image_path = None
        if figure_references:
            # Pass the local image output directory to extract_and_save_image
            task_db_image_path = extract_and_save_image(page, figure_references[0], local_image_output_dir)

        processed_tasks_for_db.append({
            "name": name.upper(),
            "definition": definition,
            "page_number": document_page_number, # Use LLM-extracted page number
            "source_reference": "FM 3-90",
            "related_figures": figure_references,
            "image_path": task_db_image_path, # This is the public-facing path
            "embedding": embedding
        })
        
    return processed_tasks_for_db

def save_task_to_db(task_data: Dict, db_session) -> None:
    """Save tactical task to database."""
    try:
        # Check if task already exists by name (could also check page_number for more uniqueness if needed)
        existing_task = db_session.query(TacticalTask).filter_by(name=task_data["name"]).first()
        if existing_task:
            logger.info(f"Task '{task_data['name']}' already exists, updating definition and other fields.")
            existing_task.definition = task_data["definition"]
            existing_task.page_number = task_data["page_number"]
            existing_task.source_reference = task_data["source_reference"]
            existing_task.related_figures = task_data["related_figures"]
            existing_task.image_path = task_data["image_path"]
            existing_task.embedding = task_data["embedding"] # Ensure embedding is updated
            # Add other fields to update as necessary
        else:
            logger.info(f"Creating new task '{task_data['name']}'.")
            db_task = TacticalTask(**task_data) # TacticalTaskCreate will handle this from dict
            db_session.add(db_task)
        
        db_session.commit()
        logger.info(f"Saved/Updated task: {task_data['name']}")
    except Exception as e:
        logger.error(f"Error saving task {task_data['name']} to database: {e}")
        db_session.rollback()

def main():
    script_dir = Path(__file__).parent
    pdf_path = script_dir / "ARN38160-FM_3-90-000-WEB-1.pdf"
    # Local directory where images will actually be saved: scripts/public/task_images/
    local_images_storage_dir = script_dir / "public" / "task_images"
    local_images_storage_dir.mkdir(parents=True, exist_ok=True)
    
    if not pdf_path.exists():
        logger.error(f"PDF file not found: {pdf_path}")
        return
    
    doc = fitz.open(pdf_path)
    
    start_pdf_page_index = 410  # PDF page 411
    end_pdf_page_index = 422    # PDF page 423
    
    # Removed manual calculation of appendix_page_num_str as LLM will provide it.

    db = SessionLocal()
    try:
        for current_pdf_page_index in range(start_pdf_page_index, end_pdf_page_index + 1):
            if current_pdf_page_index >= len(doc):
                logger.warning(f"Requested page index {current_pdf_page_index} is out of bounds. Stopping.")
                break
            
            page = doc[current_pdf_page_index]
            physical_page_num = current_pdf_page_index + 1
            
            logger.info(f"--- Processing PDF Page Index {current_pdf_page_index} (Physical Page {physical_page_num}) ---")
            
            # Pass the local image storage directory to process_page
            tasks_on_page = process_page(page, physical_page_num, local_images_storage_dir)
            
            if tasks_on_page:
                for task_data in tasks_on_page:
                    if not isinstance(task_data.get('embedding'), list) and task_data.get('embedding') is not None:
                        logger.error(f"Embedding for task {task_data.get('name')} not list/None. Skipping.")
                        continue
                    try:
                        task_to_save_pydantic = TacticalTaskCreate(**task_data)
                        save_task_to_db(task_to_save_pydantic.model_dump(), db)
                    except Exception as pydantic_error:
                        logger.error(f"Pydantic validation error for task {task_data.get('name')}: {pydantic_error}. Data: {task_data}")
            else:
                logger.info(f"No tasks processed for PDF Page Index {current_pdf_page_index}.")

    except Exception as e:
        logger.error(f"Major error during PDF processing: {e}", exc_info=True)
    finally:
        db.close()
        doc.close()
        logger.info("Script finished.")

if __name__ == "__main__":
    # Example: Ensure GOOGLE_API_KEY and DATABASE_URL are set in your environment
    # export GOOGLE_API_KEY="your_api_key"
    # export DATABASE_URL="postgresql://user:pass@host:port/dbname"
    main() 