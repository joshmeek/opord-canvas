from fastapi import APIRouter, Depends, HTTPException, Body

from app.models.ai import AIEnhancementRequest, AIEnhancementResponse
from app.services.ai_enhancer_service import enhance_text_with_ai
from app.dependencies.auth import get_current_active_user # For securing the endpoint
from app.models.user import User # For current_user type hint

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    dependencies=[Depends(get_current_active_user)] # Secure all routes in this router
)

@router.post("/enhance_text", response_model=AIEnhancementResponse)
async def enhance_text_endpoint(
    request_data: AIEnhancementRequest = Body(...),
    current_user: User = Depends(get_current_active_user) # Ensure user is authenticated
):
    """
    Receives text and returns an AI-generated enhanced version.
    """
    if not request_data.text or not request_data.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    try:
        response = await enhance_text_with_ai(request_data)
        return response
    except Exception as e:
        # Log the exception details for server-side review
        # logger.error(f"Error during text enhancement endpoint: {e}", exc_info=True)
        # In a production environment, you might want more sophisticated error logging
        raise HTTPException(status_code=500, detail=f"An error occurred during text enhancement: {str(e)}") 