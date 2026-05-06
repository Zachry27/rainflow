from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.models import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    # Jadikan user pertama sebagai admin, sisanya user biasa
    is_first_user = db.query(User).count() == 0
    role = "admin" if is_first_user else "user"
    
    new_user = User(username=user.username, password_hash=hashed_password, role=role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

class GDriveSession(BaseModel):
    client_id: str | None = None
    access_token: str | None = None

@router.post("/gdrive", response_model=GDriveSession)
def save_gdrive_session(session_data: GDriveSession, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.google_client_id = session_data.client_id
    current_user.google_access_token = session_data.access_token
    db.commit()
    db.refresh(current_user)
    return {"client_id": current_user.google_client_id, "access_token": current_user.google_access_token}

@router.get("/gdrive", response_model=GDriveSession)
def get_gdrive_session(current_user: User = Depends(get_current_user)):
    return {
        "client_id": current_user.google_client_id,
        "access_token": current_user.google_access_token
    }
