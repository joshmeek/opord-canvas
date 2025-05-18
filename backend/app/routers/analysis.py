from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Any, Dict

from app.dependencies.auth import get_current_active_user
from app.dependencies.database import get_db
from app.services.tactical_analysis_service import identify_and_retrieve_tactical_tasks
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
    Leverages Gemini for NER and validates identified tasks against the database.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    try:
        identified_tasks = await identify_and_retrieve_tactical_tasks(
            db=db, 
            text=payload.text
        )
        return identified_tasks
    except Exception as e:
        # In a production environment, we want more sophisticated error logging
        raise HTTPException(status_code=500, detail=f"An error occurred during text analysis: {str(e)}")
