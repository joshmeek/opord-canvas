from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from app.models.tactical_task import TacticalTask
from app.models.schemas import TacticalTaskCreate
from pgvector.sqlalchemy import Vector

def create_tactical_task(db: Session, task: TacticalTaskCreate) -> TacticalTask:
    db_task = TacticalTask(
        name=task.name,
        definition=task.definition,
        page_number=task.page_number,
        image_path=task.image_path,
        related_figures=task.related_figures,
        embedding=task.embedding,
        source_reference=task.source_reference
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_tactical_task(db: Session, task_id: int) -> Optional[TacticalTask]:
    return db.query(TacticalTask).filter(TacticalTask.id == task_id).first()

def get_tactical_task_by_name(db: Session, name: str) -> Optional[TacticalTask]:
    return db.query(TacticalTask).filter(TacticalTask.name == name).first()

def get_all_tactical_tasks(db: Session, skip: int = 0, limit: int = 100) -> List[TacticalTask]:
    return db.query(TacticalTask).offset(skip).limit(limit).all()

def search_similar_tasks(db: Session, embedding: List[float], limit: int = 5) -> List[TacticalTask]:
    # Search for similar tasks using cosine similarity
    stmt = select(TacticalTask).order_by(TacticalTask.embedding.cosine_distance(embedding)).limit(limit)
    return db.execute(stmt).scalars().all()

def update_tactical_task(db: Session, task_id: int, task: TacticalTaskCreate) -> Optional[TacticalTask]:
    db_task = get_tactical_task(db, task_id)
    if db_task:
        for key, value in task.dict(exclude_unset=True).items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_tactical_task(db: Session, task_id: int) -> bool:
    db_task = get_tactical_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False 