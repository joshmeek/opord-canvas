from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.crud import opord as opord_crud
from app.crud import user as user_crud
from app.models.schemas import OPORD, OPORDCreate, OPORDUpdate, User
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user
from app.services.opord_processing_service import run_tactical_analysis_and_store_results

router = APIRouter(prefix="/opords", tags=["opords"])

@router.get("/", response_model=List[OPORD])
def get_opords(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all OPORDs for the current user."""
    return opord_crud.get_opords_by_user(db, current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=OPORD)
def create_opord(
    opord: OPORDCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new OPORD and schedule background tactical analysis."""
    db_opord = opord_crud.create_opord(db, opord, current_user.id)
    if db_opord and db_opord.content:
        background_tasks.add_task(
            run_tactical_analysis_and_store_results, 
            db=db, 
            opord_id=db_opord.id
        )
    return db_opord

@router.get("/{opord_id}", response_model=OPORD)
def get_opord(
    opord_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific OPORD."""
    db_opord = opord_crud.get_opord(db, opord_id)
    if db_opord is None:
        raise HTTPException(status_code=404, detail="OPORD not found")
    if db_opord.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this OPORD")
    return db_opord

@router.put("/{opord_id}", response_model=OPORD)
def update_opord(
    opord_id: int,
    opord: OPORDUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an OPORD and schedule background tactical analysis if content changes."""
    db_opord = opord_crud.update_opord(db, opord_id, opord, current_user.id)
    if db_opord is None:
        raise HTTPException(status_code=404, detail="OPORD not found")
    
    if opord.content and db_opord.content:
        background_tasks.add_task(
            run_tactical_analysis_and_store_results, 
            db=db, 
            opord_id=db_opord.id
        )
    return db_opord

@router.delete("/{opord_id}")
def delete_opord(
    opord_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an OPORD."""
    success = opord_crud.delete_opord(db, opord_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="OPORD not found")
    return {"message": "OPORD deleted successfully"} 