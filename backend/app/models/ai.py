from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class EnhancementType(str, Enum):
    GENERAL = "general"
    CONCISENESS = "conciseness"
    CLARITY = "clarity"
    IMPACT = "impact"

class AIEnhancementRequest(BaseModel):
    text: str
    enhancement_type: EnhancementType = Field(
        default=EnhancementType.GENERAL, 
        description="The type of enhancement to apply. Available types: 'general', 'conciseness', 'clarity', 'impact'."
    )
    # Optionally, we can add context or specific instructions for enhancement later
    # e.g., enhancement_type: str = "clarity" 

class AIEnhancementResponse(BaseModel):
    original_text: str
    enhanced_text: str
    # We could also add a confidence score or other metadata if Gemini provides it 