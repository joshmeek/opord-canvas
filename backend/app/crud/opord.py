from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List, Optional

from app.models.opord import OPORD
from app.models.schemas import OPORDCreate, OPORDUpdate

def get_opord(db: Session, opord_id: int) -> Optional[OPORD]:
    """Get OPORD by ID."""
    return db.query(OPORD).filter(OPORD.id == opord_id).first()

def get_opords_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[OPORD]:
    """Get list of OPORDs for a user."""
    return db.query(OPORD).filter(OPORD.user_id == user_id).offset(skip).limit(limit).all()

def create_opord(db: Session, opord: OPORDCreate, user_id: int) -> OPORD:
    """Create new OPORD."""
    db_opord = OPORD(**opord.model_dump(), user_id=user_id)
    try:
        db.add(db_opord)
        db.commit()
        db.refresh(db_opord)
        return db_opord
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error creating OPORD"
        )

def update_opord(db: Session, opord_id: int, opord: OPORDUpdate, user_id: int) -> Optional[OPORD]:
    """Update OPORD."""
    db_opord = get_opord(db, opord_id)
    if not db_opord:
        return None
    if db_opord.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this OPORD"
        )
    
    update_data = opord.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_opord, key, value)
    
    try:
        db.commit()
        db.refresh(db_opord)
        return db_opord
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error updating OPORD"
        )

def delete_opord(db: Session, opord_id: int, user_id: int) -> bool:
    """Delete OPORD."""
    db_opord = get_opord(db, opord_id)
    if not db_opord:
        return False
    if db_opord.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this OPORD"
        )
    
    try:
        db.delete(db_opord)
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        return False 