from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.crud import user as user_crud
from app.models.schemas import UserCreate, Token, User
from app.utils.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.dependencies.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    return user_crud.create_user(db, user)

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login to get access token."""
    user = user_crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"} 