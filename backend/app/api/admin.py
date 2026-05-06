from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.models import User
from app.core.security import get_current_active_admin
from app.api.auth import UserResponse

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db), current_admin: User = Depends(get_current_active_admin)):
    users = db.query(User).all()
    return users
