from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import opord as opord_crud
from app.crud import user as user_crud
from app.models.schemas import OPORD, OPORDCreate, OPORDUpdate
from app.dependencies.database import get_db
from app.utils.security import get_current_user

router = APIRouter(prefix="/opords", tags=["opords"])

@router.get("/", response_model=List[OPORD])
def get_opords(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_email: str = Depends(get_current_user)
):
    """Get all OPORDs for the current user."""
    user = user_crud.get_user_by_email(db, current_user_email)
    return opord_crud.get_opords_by_user(db, user.id, skip=skip, limit=limit)

@router.post("/", response_model=OPORD)
def create_opord(
    opord: OPORDCreate,
    db: Session = Depends(get_db),
    current_user_email: str = Depends(get_current_user)
):
    """Create a new OPORD."""
    user = user_crud.get_user_by_email(db, current_user_email)
    return opord_crud.create_opord(db, opord, user.id)

@router.get("/{opord_id}", response_model=OPORD)
def get_opord(
    opord_id: int,
    db: Session = Depends(get_db),
    current_user_email: str = Depends(get_current_user)
):
    """Get a specific OPORD."""
    user = user_crud.get_user_by_email(db, current_user_email)
    db_opord = opord_crud.get_opord(db, opord_id)
    if db_opord is None:
        raise HTTPException(status_code=404, detail="OPORD not found")
    if db_opord.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this OPORD")
    return db_opord

@router.put("/{opord_id}", response_model=OPORD)
def update_opord(
    opord_id: int,
    opord: OPORDUpdate,
    db: Session = Depends(get_db),
    current_user_email: str = Depends(get_current_user)
):
    """Update an OPORD."""
    user = user_crud.get_user_by_email(db, current_user_email)
    db_opord = opord_crud.update_opord(db, opord_id, opord, user.id)
    if db_opord is None:
        raise HTTPException(status_code=404, detail="OPORD not found")
    return db_opord

@router.delete("/{opord_id}")
def delete_opord(
    opord_id: int,
    db: Session = Depends(get_db),
    current_user_email: str = Depends(get_current_user)
):
    """Delete an OPORD."""
    user = user_crud.get_user_by_email(db, current_user_email)
    success = opord_crud.delete_opord(db, opord_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="OPORD not found")
    return {"message": "OPORD deleted successfully"} 