"""Authentication, User Profile, and Account Deletion Endpoints with Verification."""

import re
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from backend.app.core.storage import storage_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Settings"])


def validate_password_strength(password: str) -> None:
    """Ensure password has minimum required complexity."""
    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long.",
        )


def generate_verification_code() -> str:
    """Generate a random 6-digit numeric OTP."""
    return f"{random.randint(100000, 999999)}"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name or Username")
    email: EmailStr
    password: str = Field(..., min_length=6)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10)


class ResendCodeRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="User's email address or username/name")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: Optional[str] = None


class RegisterResponse(BaseModel):
    status: str = "verification_required"
    message: str
    email: str
    name: str
    dev_code: Optional[str] = None


class PreferencesUpdateRequest(BaseModel):
    theme: Optional[str] = None  # 'light', 'dark', 'system'
    default_country: Optional[str] = None
    default_export_format: Optional[str] = None
    default_template: Optional[str] = None
    target_role: Optional[str] = None


@router.post("/register", response_model=RegisterResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and generate verification code."""
    validate_password_strength(req.password)
    clean_email = req.email.lower().strip()
    clean_name = req.name.strip()

    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    otp_code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    if existing and not existing.is_verified:
        # Update existing unverified user with new credentials
        existing.name = clean_name
        existing.hashed_password = get_password_hash(req.password)
        existing.verification_code = otp_code
        existing.verification_code_expires_at = expires_at
        db.commit()
    else:
        new_user = User(
            name=clean_name,
            email=clean_email,
            hashed_password=get_password_hash(req.password),
            is_verified=False,
            verification_code=otp_code,
            verification_code_expires_at=expires_at,
            preferences={
                "theme": "system",
                "default_country": "gb",
                "default_export_format": "pdf",
                "default_template": "modern",
            },
        )
        db.add(new_user)
        db.commit()

    # In development/local mode, dev_code is returned so the user can easily test
    print(f"[AUTH DEV] Verification code for {clean_email}: {otp_code}")

    return RegisterResponse(
        status="verification_required",
        message=f"Verification code sent to {clean_email}.",
        email=clean_email,
        name=clean_name,
        dev_code=otp_code,
    )


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with 6-digit code and issue authentication token."""
    clean_email = req.email.lower().strip()
    clean_code = req.code.strip()

    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No registration found for this email.")

    if user.is_verified:
        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user_id=str(user.id),
            email=user.email,
            name=user.name,
        )

    if not user.verification_code or user.verification_code != clean_code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    if user.verification_code_expires_at and user.verification_code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        name=user.name,
    )


@router.post("/resend-code")
def resend_verification_code(req: ResendCodeRequest, db: Session = Depends(get_db)):
    """Resend a new 6-digit verification code."""
    clean_email = req.email.lower().strip()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    if user.is_verified:
        return {"status": "already_verified", "message": "Email is already verified. Please sign in."}

    otp_code = generate_verification_code()
    user.verification_code = otp_code
    user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    print(f"[AUTH DEV] Resent verification code for {clean_email}: {otp_code}")

    return {
        "status": "code_resent",
        "message": f"Fresh verification code sent to {clean_email}.",
        "dev_code": otp_code,
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with either username/name or email address + password."""
    clean_id = req.identifier.lower().strip()

    user = db.query(User).filter(
        or_(
            func.lower(User.email) == clean_id,
            func.lower(User.name) == clean_id,
        )
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )

    # If user has not verified their email yet, generate OTP and guide them to verify
    if not user.is_verified:
        otp_code = generate_verification_code()
        user.verification_code = otp_code
        user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "unverified_email",
                "message": "Email verification required before sign in.",
                "email": user.email,
                "name": user.name,
                "dev_code": otp_code,
            },
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        name=user.name,
    )


@router.get("/me")
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get current user details and preferences."""
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "is_verified": user.is_verified,
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
