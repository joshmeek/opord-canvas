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
    TEXT_GENERATION_MODEL_NAME = os.getenv("TEXT_GENERATION_MODEL_NAME", "gemini-2.0-flash") # Updated to a generally good model
    generative_model = genai.GenerativeModel(TEXT_GENERATION_MODEL_NAME)

# FEW SHOT
async def identify_and_retrieve_tactical_tasks(
    db: Session,
    text: str
    # Removed: known_task_names: List[str]
) -> List[Dict[str, Any]]:
    """
    Identifies potential tactical tasks in text using Gemini NER,
    then validates and retrieves their full details from the DB.
    Returns a list of dictionaries, where each dictionary contains the recognized task's details
    and its start/end position in the input text.
    """
    if not generative_model:
        logger.error("Generative model not initialized. Cannot perform NER.")
        return []

    # Updated prompt: General instruction for identifying military tasks
    prompt = f"""You are an expert military doctrine analyst specializing in Named Entity Recognition (NER).
Your task is to identify occurrences of specific military tactical tasks (e.g., "SEIZE", "OCCUPY", "ATTACK BY FIRE", "CONDUCT RECONNAISSANCE") within the provided text.
These tasks are typically verbs or short verb phrases describing a specific military action.

For each identified potential tactical task, provide:
1. The exact task name as you identify it (e.g., "SEIZE", "OCCUPY").
2. The starting character index of the task mention in the input text.
3. The ending character index of the task mention in the input text.

Input Text:
---
{text}
---

Output the results as a JSON list of objects. Each object should represent a single recognized task instance and have the following keys:
- "task_name": The recognized tactical task name.
- "start_index": The starting character index of the mention.
- "end_index": The ending character index of the mention.

If no potential tactical tasks are found in the text, return an empty JSON list: [].

Example:
Input Text: "The platoon will SEIZE the bridge and then OCCUPY Hill 405. Later, they will CONDUCT RECONNAISSANCE of the northern route."
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
  }},
  {{
    "task_name": "CONDUCT RECONNAISSANCE",
    "start_index": 79,
    "end_index": 101
  }}
]
"""

    enriched_tasks = []
    try:
        logger.debug(f"Sending text to Gemini for general NER. Text length: {len(text)} chars.")
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
                    all(k in entity for k in ["task_name", "start_index", "end_index"])):
                logger.warning(f"Invalid entity structure from Gemini NER: {entity}")
                continue

            potential_task_name = entity["task_name"]
            start_index = entity["start_index"]
            end_index = entity["end_index"]

            # Retrieve full task details from DB to validate if it's a known task
            task_details_db = get_tactical_task_by_name(db, name=potential_task_name)
            
            if task_details_db:
                # Convert SQLAlchemy model to Pydantic model for consistent output
                task_details_schema = TacticalTaskSchema.from_orm(task_details_db)
                enriched_tasks.append({
                    "task_name": potential_task_name, # Use the name Gemini identified that we found in DB
                    "start_index": start_index,
                    "end_index": end_index,
                    "details": task_details_schema.model_dump() # Use .model_dump() for Pydantic v2
                })
                logger.info(f"Validated and retrieved task: '{potential_task_name}' from DB.")
            else:
                logger.info(f"Task '{potential_task_name}' identified by NER but not found in database. Ignoring.")
        
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from Gemini NER response: {e}. Response text: {cleaned_response_text[:500]}...")
    except AttributeError as e: # Catching potential AttributeError if response.text is not available
        logger.error(f"AttributeError with Gemini response: {e}. Full response: {response}")
    except Exception as e:
        logger.error(f"Error in NER processing or DB lookup: {e}", exc_info=True)

    return enriched_tasks 