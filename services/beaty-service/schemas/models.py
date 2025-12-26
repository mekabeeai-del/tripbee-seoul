"""
Beaty Service - Pydantic Models
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel


class UserLocation(BaseModel):
    lat: float
    lng: float


class BeatyRequest(BaseModel):
    query: str
    user_location: Optional[UserLocation] = None
    mode: Optional[str] = "real"  # "real" or "test"


class ToolCall(BaseModel):
    """도구 호출 정보"""
    name: str
    arguments: Dict[str, Any]


class ToolResult(BaseModel):
    """도구 실행 결과"""
    tool_name: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AgentResponse(BaseModel):
    """에이전트 최종 응답"""
    success: bool
    answer: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    data: Optional[Dict[str, Any]] = None  # POIs, routes 등
