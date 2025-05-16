from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.schemas import TacticalTask, TacticalTaskCreate, User
from app.crud import tactical_task

router = APIRouter(
    prefix="/tactical-tasks",
    tags=["tactical-tasks"]
)

@router.post("/", response_model=TacticalTask)
def create_tactical_task(
    task: TacticalTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = tactical_task.get_tactical_task_by_name(db, name=task.name)
    if db_task:
        raise HTTPException(status_code=400, detail="Task name already registered")
    return tactical_task.create_tactical_task(db=db, task=task)

@router.get("/{task_id}", response_model=TacticalTask)
def read_tactical_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = tactical_task.get_tactical_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.get("/", response_model=List[TacticalTask])
def read_tactical_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = tactical_task.get_all_tactical_tasks(db, skip=skip, limit=limit)
    return tasks

@router.put("/{task_id}", response_model=TacticalTask)
def update_tactical_task(
    task_id: int,
    task: TacticalTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = tactical_task.update_tactical_task(db=db, task_id=task_id, task=task)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.delete("/{task_id}")
def delete_tactical_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = tactical_task.delete_tactical_task(db=db, task_id=task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "Task deleted successfully"}

@router.post("/search/similar", response_model=List[TacticalTask])
def search_similar_tasks(
    embedding: List[float],
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = tactical_task.search_similar_tasks(db=db, embedding=embedding, limit=limit)
    return tasks 