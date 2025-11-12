"""
Common Models
공통 모델 정의
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class UserLocation(BaseModel):
    """사용자 위치"""
    lat: float
    lng: float


class CategoryInfo(BaseModel):
    """카테고리 정보"""
    cat_code: str
    cat_level: int
    content_type_id: str


class POIMetadata(BaseModel):
    """POI 메타데이터 (경량)"""
    content_id: str
    title: str
    lat: float
    lng: float
    cat1: Optional[str] = None
    cat2: Optional[str] = None
    cat3: Optional[str] = None
    content_type_id: Optional[str] = None
    addr1: Optional[str] = None
    first_image: Optional[str] = None


class POIDetail(BaseModel):
    """POI 상세 정보 (전체)"""
    content_id: str
    title: str
    addr1: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    first_image: Optional[str] = None
    overview: Optional[str] = None
    content_type_id: Optional[str] = None
    cat1: Optional[str] = None
    cat2: Optional[str] = None
    cat3: Optional[str] = None
    common_data: Optional[Dict[str, Any]] = None
    intro_data: Optional[Dict[str, Any]] = None
    repeat_data: Optional[Dict[str, Any]] = None
    images_data: Optional[Dict[str, Any]] = None
