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
    logger.error("GOOGLE_API_KEY not found. NER service will not function.")
    generative_model = None
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    TEXT_GENERATION_MODEL_NAME = os.getenv("TEXT_GENERATION_MODEL_NAME", "gemini-2.0-flash")
    generative_model = genai.GenerativeModel(TEXT_GENERATION_MODEL_NAME)

async def identify_and_retrieve_tactical_tasks(
    db: Session,
    text: str
) -> List[Dict[str, Any]]:
    """
    Identifies and retrieves details for tactical tasks in military text.
    
    Uses Gemini AI to perform Named Entity Recognition (NER) on military text,
    identifying potential tactical tasks. For each identified task, retrieves
    full details from the database.
    
    Args:
        db: Database session
        text: Military text to analyze
        
    Returns:
        List of dictionaries containing task details and their positions in the text
        
    Note:
        If the AI service is unavailable, returns an empty list.
    """
    if not generative_model:
        logger.error("Generative model not initialized. Cannot perform NER.")
        return []

    prompt = f"""You are an expert military doctrine analyst specializing in Named Entity Recognition (NER).
Your task is to identify occurrences of specific military tactical tasks (e.g., "SEIZE", "OCCUPY", "ATTACK BY FIRE", "CONDUCT RECONNAISSANCE") within the provided text.
These tasks are typically verbs or short verb phrases describing a specific military action.

For each identified potential tactical task, provide:
1. The exact task name as you identify it (e.g., "SEIZE", "OCCUPY", "BYPASS").
2. The starting character index of the task mention in the input text (a number).
3. The ending character index of the task mention in the input text (a number).

IMPORTANT: Return a valid JSON array. Replace TASK_NAME with the actual task name found, and START_INDEX/END_INDEX with actual numbers.
Do not return the template literally. If no tasks are found, return an empty array: []

Input Text:
{text}

Expected JSON format (replace with actual values):
[
  {{
    "task_name": "SEIZE",
    "start_index": 45,
    "end_index": 50
  }},
  ...
]"""

    try:
        logger.debug(f"Sending text to Gemini for NER. Text length: {len(text)} chars.")
        response = generative_model.generate_content(prompt)
        
        cleaned_response_text = response.text.strip()
        if cleaned_response_text.startswith("```json"):
            cleaned_response_text = cleaned_response_text[7:]
        elif cleaned_response_text.startswith("```"):
            cleaned_response_text = cleaned_response_text[3:]
        if cleaned_response_text.endswith("```"):
            cleaned_response_text = cleaned_response_text[:-3]
        
        cleaned_response_text = cleaned_response_text.strip()
        logger.debug(f"Gemini NER response (cleaned): {cleaned_response_text[:500]}...")
        
        try:
            recognized_entities = json.loads(cleaned_response_text)
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse Gemini response as JSON: {json_err}. Response: {cleaned_response_text}")
            return []
            
        if not isinstance(recognized_entities, list):
            logger.warning(f"Gemini NER did not return a list. Response: {cleaned_response_text}")
            return []
            
        # Validate and enrich the recognized tasks
        enriched_results = []
        for entity in recognized_entities:
            task_name = entity.get("task_name", "").strip().upper()
            if not task_name:
                continue
                
            # Get full task details from database
            db_task = get_tactical_task_by_name(db, task_name)
            if not db_task:
                logger.debug(f"Task '{task_name}' not found in database, skipping.")
                continue
                
            # Add task details and position to results
            enriched_results.append({
                "task": task_name,
                "position": {
                    "start": entity["start_index"],
                    "end": entity["end_index"]
                },
                "definition": db_task.definition,
                "page_number": db_task.page_number,
                "image_path": db_task.image_path,
                "id": db_task.id
            })
            
        return enriched_results
            
    except Exception as e:
        logger.error(f"Error during tactical task identification: {e}", exc_info=True)
        return [] 