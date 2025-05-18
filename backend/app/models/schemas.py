from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    """Base schema for user data."""
    email: EmailStr

class UserCreate(UserBase):
    """Schema for user creation, extends UserBase with password."""
    password: str

class User(UserBase):
    """
    Schema for user responses, extends UserBase with system fields.
    
    Attributes:
        id: User's unique identifier
        created_at: Timestamp of user creation
        updated_at: Optional timestamp of last update
    """
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# OPORD schemas
class OPORDBase(BaseModel):
    """
    Base schema for Operations Orders (OPORDs).
    
    Attributes:
        title: Title of the OPORD
        content: Full text content of the OPORD
        analysis_results: Optional list of tactical task analysis results
    """
    title: str
    content: str
    analysis_results: Optional[List[Dict[str, Any]]] = None

class OPORDCreate(OPORDBase):
    """Schema for OPORD creation, uses all fields from OPORDBase."""
    pass

class OPORDUpdate(OPORDBase):
    """
    Schema for OPORD updates, all fields are optional.
    
    This allows partial updates where only some fields are modified.
    """
    title: Optional[str] = None
    content: Optional[str] = None
    analysis_results: Optional[List[Dict[str, Any]]] = None

class OPORD(OPORDBase):
    """
    Schema for OPORD responses, extends OPORDBase with system fields.
    
    Attributes:
        id: OPORD's unique identifier
        user_id: ID of the OPORD's creator
        created_at: Timestamp of OPORD creation
        updated_at: Optional timestamp of last update
    """
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# TacticalTask schemas
class TacticalTaskBase(BaseModel):
    """
    Base schema for tactical tasks from military doctrine.
    
    Attributes:
        name: Name of the tactical task
        definition: Full definition/description of the task
        page_number: Page number in source document
        source_reference: Reference document (defaults to FM 3-90)
    """
    name: str
    definition: str
    page_number: str
    source_reference: str = "FM 3-90"

class TacticalTaskCreate(TacticalTaskBase):
    image_path: Optional[str] = None
    related_figures: Optional[List[str]] = None
    embedding: Optional[List[float]] = None

class TacticalTask(TacticalTaskBase):
    """
    Schema for tactical task responses, extends base with additional fields.
    
    Attributes:
        id: Task's unique identifier
        image_path: Optional path to associated diagram/image
        related_figures: Optional list of related figure references
    """
    id: int
    image_path: Optional[str] = None
    related_figures: Optional[List[str]] = None

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    """Schema for authentication tokens."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Schema for decoded token data."""
    email: Optional[str] = None 