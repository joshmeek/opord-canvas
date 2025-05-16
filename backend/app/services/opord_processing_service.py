import logging
from sqlalchemy.orm import Session

from app.services.tactical_analysis_service import identify_and_retrieve_tactical_tasks
from app.crud.opord import get_opord # To fetch the OPORD for update

logger = logging.getLogger(__name__)

async def run_tactical_analysis_and_store_results(
    db: Session,
    opord_id: int
):
    """
    Retrieves OPORD content, performs tactical analysis, and stores the results in the DB.
    Intended to be run as a background task.
    """
    logger.info(f"Starting background tactical analysis for OPORD ID: {opord_id}")
    db_opord = get_opord(db=db, opord_id=opord_id)

    if not db_opord:
        logger.error(f"OPORD ID: {opord_id} not found for background analysis. Skipping.")
        return

    if not db_opord.content:
        logger.info(f"OPORD ID: {opord_id} has no content. Skipping analysis.")
        db_opord.analysis_results = [] # Store empty list if no content
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
        # Optionally, set analysis_results to an error state or leave as is
        # db_opord.analysis_results = {"error": str(e)} 
        # db.commit() # If you want to store the error state 