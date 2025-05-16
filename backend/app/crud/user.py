from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import Optional

from app.models.user import User
from app.models.schemas import UserCreate
from app.utils.security import get_password_hash, verify_password

def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    """Get list of users."""
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    """Create new user."""
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error creating user"
        )

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def update_user(db: Session, user_id: int, user_data: dict) -> Optional[User]:
    """Update user."""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    for key, value in user_data.items():
        if key == "password":
            setattr(db_user, "hashed_password", get_password_hash(value))
        else:
            setattr(db_user, key, value)
    
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error updating user"
        )

def delete_user(db: Session, user_id: int) -> bool:
    """Delete user."""
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    
    try:
        db.delete(db_user)
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        return False 