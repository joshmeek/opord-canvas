import os
import logging
import json
import google.generativeai as genai
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.crud.tactical_task import get_tactical_task_by_name
from app.models.schemas import TacticalTask as TacticalTaskSchema

logger = logging.getLogger(__name__)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    # In a real app, you might raise an error or have a fallback
    logger.error("GOOGLE_API_KEY not found. NER service will not function.")
    generative_model = None
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    TEXT_GENERATION_MODEL_NAME = os.getenv("TEXT_GENERATION_MODEL_NAME", "gemini-2.0-flash") # Using gemini-pro for NER
    generative_model = genai.GenerativeModel(TEXT_GENERATION_MODEL_NAME)

async def identify_and_retrieve_tactical_tasks(
    db: Session,
    text: str,
    known_task_names: List[str] # Pass the list of all known task names from DB for more precise NER
) -> List[Dict[str, Any]]:
    """
    Identifies tactical tasks in text using Gemini NER, then retrieves their full details from the DB.
    Returns a list of dictionaries, where each dictionary contains the recognized task's details
    and its start/end position in the input text.
    """
    if not generative_model:
        logger.error("Generative model not initialized. Cannot perform NER.")
        return []

    # Prepare a dynamic list of task names for the prompt to aid Gemini
    task_names_str = ", ".join([f'\"{name}\"' for name in known_task_names])

    prompt = f"""You are an expert military doctrine analyst specializing in Named Entity Recognition (NER).
Your task is to identify occurrences of specific military tactical tasks within the provided text.

Focus ONLY on identifying exact matches or very close variations of the following known tactical task names: {task_names_str}.

For each identified tactical task, provide:
1. The exact task name as it appears in the provided list (e.g., "SEIZE", "OCCUPY").
2. The starting character index of the task mention in the input text.
3. The ending character index of the task mention in the input text.

Input Text:
---
{text}
---

Output the results as a JSON list of objects. Each object should represent a single recognized task instance and have the following keys:
- "task_name": The recognized tactical task name (from the provided list).
- "start_index": The starting character index of the mention.
- "end_index": The ending character index of the mention.

If no known tactical tasks are found in the text, return an empty JSON list: [].

Example:
Input Text: "The platoon will SEIZE the bridge and then OCCUPY Hill 405."
Known Tasks: ["SEIZE", "OCCUPY", "ATTACK BY FIRE"]
Output:
[
  {{
    "task_name": "SEIZE",
    "start_index": 19,
    "end_index": 24
  }},
  {{
    "task_name": "OCCUPY",
    "start_index": 44,
    "end_index": 50
  }}
]
"""

    enriched_tasks = []
    try:
        logger.debug(f"Sending text to Gemini for NER. Text length: {len(text)} chars. Known tasks: {task_names_str[:200]}...")
        response = generative_model.generate_content(prompt)
        
        cleaned_response_text = response.text.strip()
        if cleaned_response_text.startswith("```json"):
            cleaned_response_text = cleaned_response_text[7:]
        elif cleaned_response_text.startswith("```"):
            cleaned_response_text = cleaned_response_text[3:]
        if cleaned_response_text.endswith("```"):
            cleaned_response_text = cleaned_response_text[:-3]
        
        logger.debug(f"Gemini NER response (cleaned): {cleaned_response_text[:500]}...")
        
        recognized_entities = json.loads(cleaned_response_text)
        if not isinstance(recognized_entities, list):
            logger.warning(f"Gemini NER did not return a list. Response: {cleaned_response_text}")
            return []

        for entity in recognized_entities:
            if not (isinstance(entity, dict) and 
                    all(k in entity for k in ["task_name", "start_index", "end_index"])
                    and entity["task_name"] in known_task_names):
                logger.warning(f"Invalid or unknown task entity from Gemini NER: {entity}")
                continue

            task_name = entity["task_name"]
            start_index = entity["start_index"]
            end_index = entity["end_index"]

            # Retrieve full task details from DB
            task_details_db = get_tactical_task_by_name(db, name=task_name)
            if task_details_db:
                # Convert SQLAlchemy model to Pydantic model for consistent output
                task_details_schema = TacticalTaskSchema.from_orm(task_details_db)
                enriched_tasks.append({
                    "task_name": task_name,
                    "start_index": start_index,
                    "end_index": end_index,
                    "details": task_details_schema.model_dump() # Use .model_dump() for Pydantic v2
                })
            else:
                logger.warning(f"Task '{task_name}' identified by NER but not found in database.")
        
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from Gemini NER response: {e}. Response text: {cleaned_response_text[:500]}...")
    except Exception as e:
        logger.error(f"Error in NER processing or DB lookup: {e}", exc_info=True)

    return enriched_tasks 