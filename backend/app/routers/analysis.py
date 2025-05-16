from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Any, Dict

from app.dependencies.auth import get_current_active_user
from app.dependencies.database import get_db
from app.services.tactical_analysis_service import identify_and_retrieve_tactical_tasks
from app.crud.tactical_task import get_all_tactical_task_names # To get known tasks
from app.models.user import User # For current user dependency

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(get_current_active_user)]
)

class TextForAnalysis(BaseModel):
    text: str

@router.post("/tasks", response_model=List[Dict[str, Any]])
async def analyze_text_for_tactical_tasks(
    payload: TextForAnalysis = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyzes input text to identify tactical tasks, their positions, and their details.
    Leverages Gemini for NER and retrieves full task information from the database.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    # Fetch all known tactical task names from the database
    # This list will be passed to the NER service to guide Gemini
    known_task_names_db = get_all_tactical_task_names(db)
    if not known_task_names_db:
        # If there are no tasks in the DB, NER can't effectively find any
        return []

    try:
        identified_tasks = await identify_and_retrieve_tactical_tasks(
            db=db, 
            text=payload.text, 
            known_task_names=known_task_names_db
        )
        return identified_tasks
    except Exception as e:
        # Log the exception details for server-side review
        # logger.error(f"Error during tactical task analysis: {e}", exc_info=True)
        # In a production environment, you might want more sophisticated error logging
        raise HTTPException(status_code=500, detail=f"An error occurred during text analysis: {str(e)}")

# TODO: Add a Pydantic response model for better OpenAPI documentation and validation
# For now, using List[Dict[str, Any]] for flexibility during development.

# Note: The current_user dependency is commented out for now for easier testing via curl.
# Uncomment it and the dependency in APIRouter to secure the endpoint.
# Re-enabled authentication for this endpoint. 