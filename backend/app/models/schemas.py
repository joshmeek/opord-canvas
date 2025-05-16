from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# OPORD schemas
class OPORDBase(BaseModel):
    title: str
    content: str

class OPORDCreate(OPORDBase):
    pass

class OPORDUpdate(OPORDBase):
    title: Optional[str] = None
    content: Optional[str] = None

class OPORD(OPORDBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# TacticalTask schemas
class TacticalTaskBase(BaseModel):
    name: str
    definition: str
    page_number: str
    source_reference: str = "FM 3-90"

class TacticalTaskCreate(TacticalTaskBase):
    image_path: Optional[str] = None
    related_figures: Optional[List[str]] = None
    embedding: Optional[List[float]] = None

class TacticalTask(TacticalTaskBase):
    id: int
    image_path: Optional[str] = None
    related_figures: Optional[List[str]] = None

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 