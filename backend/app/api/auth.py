"""
AI Interview Feedback MVP - Authentication API Endpoints

This module defines authentication and user-related API endpoints.
Uses Supabase Auth for authentication.

Author: AI Interview Assistant Team
"""

from fastapi import APIRouter, Form, Depends, HTTPException
from typing import Optional

from app.services.auth_service import (
    sign_up, sign_in, sign_out, refresh_token,
    get_current_user, require_auth, request_password_reset
)
from app.models.schemas import (
    UserCreate, UserLogin, TokenResponse,
    TokenRefreshRequest, UserResponse
)

# Create router for auth endpoints
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ===========================================
# Registration
# ===========================================

@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user account.
    
    Creates a new user in Supabase Auth and returns access tokens.
    
    Args:
        user_data: Email, password (min 8 chars), and optional full name
    
    Returns:
        TokenResponse: Access token, refresh token, and user info
    
    Raises:
        HTTPException 400: If registration fails (email exists, weak password, etc.)
        HTTPException 503: If auth service unavailable
    """
    result = await sign_up(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    return result


# ===========================================
# Login
# ===========================================

@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: UserLogin):
    """
    Login with email and password.
    
    Authenticates user and returns access tokens.
    
    Args:
        credentials: Email and password
    
    Returns:
        TokenResponse: Access token, refresh token, and user info
    
    Raises:
        HTTPException 401: If credentials are invalid
        HTTPException 503: If auth service unavailable
    """
    result = await sign_in(
        email=credentials.email,
        password=credentials.password
    )
    return result


# ===========================================
# Logout
# ===========================================

@router.post("/logout")
async def logout_user(user: Optional[dict] = Depends(get_current_user)):
    """
    Logout the current user.
    
    Invalidates the current session.
    
    Returns:
        dict: Success message
    """
    if user:
        return await sign_out("")
    return {"message": "Already logged out"}


# ===========================================
# Token Refresh
# ===========================================

@router.post("/refresh", response_model=TokenResponse)
async def refresh_user_token(refresh_data: TokenRefreshRequest):
    """
    Refresh access token using refresh token.
    
    Use this when your access token expires to get a new one
    without requiring the user to login again.
    
    Args:
        refresh_data: The refresh token from previous login
    
    Returns:
        TokenResponse: New access and refresh tokens
    
    Raises:
        HTTPException 401: If refresh token is invalid or expired
    """
    result = await refresh_token(refresh_data.refresh_token)
    return result


# ===========================================
# Current User Info
# ===========================================

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: dict = Depends(require_auth)):
    """
    Get current authenticated user info.
    
    Requires valid authentication token in Authorization header.
    
    Returns:
        UserResponse: User profile information
    
    Raises:
        HTTPException 401: If not authenticated
    """
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        created_at=None  # Not available from token
    )


# ===========================================
# Password Reset
# ===========================================

@router.post("/forgot-password")
async def forgot_password(email: str = Form(...)):
    """
    Request password reset email.
    
    Sends a password reset link to the provided email if account exists.
    For security, always returns success message regardless of whether
    the email exists.
    
    Args:
        email: User's email address
    
    Returns:
        dict: Success message
    """
    return await request_password_reset(email)


# ===========================================
# Password Update (after reset)
# ===========================================

@router.post("/update-password")
async def update_password(
    new_password: str = Form(..., min_length=8),
    user: dict = Depends(require_auth)
):
    """
    Update password for authenticated user.
    
    Requires valid authentication (from reset link or normal login).
    
    Args:
        new_password: New password (min 8 characters)
        user: Current authenticated user
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If password update fails
    """
    from app.services.auth_service import get_supabase_client
    
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    
    try:
        supabase.auth.update_user({"password": new_password})
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update password: {str(e)}")
