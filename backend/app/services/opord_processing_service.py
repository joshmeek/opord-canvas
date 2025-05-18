import logging
from sqlalchemy.orm import Session

from app.services.tactical_analysis_service import identify_and_retrieve_tactical_tasks
from app.crud.opord import get_opord, update_opord

logger = logging.getLogger(__name__)

async def run_tactical_analysis_and_store_results(
    db: Session,
    opord_id: int
):
    """
    Performs tactical task analysis on an OPORD's content and stores the results.
    
    This function is designed to be run as a background task. It:
    1. Retrieves the OPORD from the database
    2. Checks for valid content
    3. Performs tactical analysis using NLP
    4. Stores the analysis results back in the OPORD
    
    Args:
        db: Database session
        opord_id: ID of the OPORD to analyze
    
    Note:
        If the OPORD has no content, an empty analysis result will be stored.
        Any errors during analysis are logged but won't stop the application.
    """
    logger.info(f"Starting background tactical analysis for OPORD ID: {opord_id}")
    db_opord = get_opord(db=db, opord_id=opord_id)

    if not db_opord:
        logger.error(f"OPORD ID: {opord_id} not found for background analysis. Skipping.")
        return

    if not db_opord.content:
        logger.info(f"OPORD ID: {opord_id} has no content. Skipping analysis.")
        db_opord.analysis_results = []
        try:
            db.commit()
            logger.info(f"Stored empty analysis results for OPORD ID: {opord_id} due to no content.")
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing empty analysis for OPORD ID {opord_id}: {e}", exc_info=True)
        return

    try:
        logger.debug(f"Performing tactical analysis for OPORD ID: {opord_id}...")
        analysis_results = await identify_and_retrieve_tactical_tasks(
            db=db, 
            text=db_opord.content
        )
        
        db_opord.analysis_results = analysis_results
        db.commit()
        logger.info(f"Successfully performed analysis and stored results for OPORD ID: {opord_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error during background tactical analysis for OPORD ID {opord_id}: {e}", exc_info=True)
        # Store error state in analysis_results
        db_opord.analysis_results = {
            "error": "Analysis failed",
            "details": str(e)
        }
        try:
            db.commit()
        except Exception as commit_error:
            logger.error(f"Failed to store error state for OPORD ID {opord_id}: {commit_error}", exc_info=True)