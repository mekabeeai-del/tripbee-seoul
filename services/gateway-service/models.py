"""
Gateway Service - Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel


class RouteCreate(BaseModel):
    """라우트 생성 요청"""
    service_name: str
    target_url: str
    prefix: str
    swagger_url: Optional[str] = "/docs"


class RouteUpdate(BaseModel):
    """라우트 수정 요청"""
    service_name: Optional[str] = None
    target_url: Optional[str] = None
    prefix: Optional[str] = None
    swagger_url: Optional[str] = None
    is_active: Optional[bool] = None


class RouteResponse(BaseModel):
    """라우트 응답"""
    id: int
    service_name: str
    target_url: str
    prefix: str
    swagger_url: Optional[str]
    is_active: bool
