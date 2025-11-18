"""
Privacy Service - Pydantic Models
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# =====================================================================================
# REQUEST MODELS
# =====================================================================================

class OAuthLoginRequest(BaseModel):
    """OAuth 로그인 요청"""
    provider: str  # "google" or "apple"
    provider_user_id: str
    provider_email: str
    name: Optional[str] = None
    profile_image_url: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None


# =====================================================================================
# RESPONSE MODELS
# =====================================================================================

class SessionResponse(BaseModel):
    """세션 응답"""
    success: bool
    session_token: str
    refresh_token: str
    expires_at: str
    user: dict


class UserResponse(BaseModel):
    """사용자 정보 응답"""
    success: bool
    user: dict
    session_id: str


class LogoutResponse(BaseModel):
    """로그아웃 응답"""
    success: bool
    message: str
