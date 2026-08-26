"""Authentication, User Profile, and Account Deletion Endpoints."""

import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from backend.app.core.storage import storage_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Settings"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class PreferencesUpdateRequest(BaseModel):
    theme: Optional[str] = None  # 'light', 'dark', 'system'
    default_country: Optional[str] = None
    default_export_format: Optional[str] = None
    default_template: Optional[str] = None
    target_role: Optional[str] = None


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        preferences={
            "theme": "system",
            "default_country": "gb",
            "default_export_format": "pdf",
            "default_template": "modern",
        },
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user_id=str(new_user.id),
        email=new_user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login and obtain access token."""
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
    )


@router.get("/me")
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get current user details and preferences."""
    return {
        "id": str(user.id),
        "email": user.email,
        "preferences": user.preferences,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "has_active_cv": bool(user.profile and user.profile.raw_text),
        "active_cv_filename": user.profile.raw_file_name if user.profile else None,
        "cv_last_updated": user.profile.updated_at.isoformat() if user.profile and user.profile.updated_at else None,
    }


@router.put("/preferences")
def update_preferences(
    req: PreferencesUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user preferences (theme, default country, template)."""
    current_prefs = dict(user.preferences or {})
    if req.theme:
        current_prefs["theme"] = req.theme
    if req.default_country:
        current_prefs["default_country"] = req.default_country
    if req.default_export_format:
        current_prefs["default_export_format"] = req.default_export_format
    if req.default_template:
        current_prefs["default_template"] = req.default_template
    if req.target_role:
        current_prefs["target_role"] = req.target_role

    user.preferences = current_prefs
    db.commit()
    return {"status": "success", "preferences": user.preferences}


@router.delete("/account")
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Complete Account Deletion Cascade:
    Permanently purges the user, all profile data, applications, mock sessions, roadmaps, and stored S3/local files.
    """
    user_id = user.id

    # Purge physical files in storage
    storage_service.delete_user_files(user_id)

    # Delete User record (SQLAlchemy cascade deletes associated profiles, applications, sessions, roadmaps)
    db.delete(user)
    db.commit()

    return {"status": "success", "message": "Account and all associated personal data permanently deleted."}
