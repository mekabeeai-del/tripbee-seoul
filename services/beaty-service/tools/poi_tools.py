"""
POI 관련 도구들
- poi-service (8001) 호출
- beatmap-service (8200) 호출
"""

import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

POI_SERVICE_URL = "http://localhost:8001"


# ============================================================================
# 도구 정의 (OpenAI Function Calling 형식)
# ============================================================================

TOOL_DEFINITIONS = [
    {
        "name": "search_poi_recommend",
        "description": "감정이나 분위기 키워드를 기반으로 POI를 추천합니다. 예: '조용한 카페', '힐링되는 곳', '데이트하기 좋은 곳'",
        "parameters": {
            "type": "object",
            "properties": {
                "query_text": {
                    "type": "string",
                    "description": "사용자의 원본 질의 (예: '조용한 카페 추천해줘')"
                },
                "location": {
                    "type": "string",
                    "description": "위치 키워드 (예: '홍대', '강남'). 없으면 null"
                },
                "emotions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "감정/분위기 키워드 목록 (예: ['조용한', '힐링'])"
                },
                "category": {
                    "type": "string",
                    "description": "카테고리 (예: '카페', '맛집', '관광지')"
                },
                "limit": {
                    "type": "integer",
                    "description": "최대 결과 수 (기본값: 5)",
                    "default": 5
                }
            },
            "required": ["query_text"]
        }
    },
    {
        "name": "search_poi_google",
        "description": "Google Places API를 사용해 구체적인 장소를 검색합니다. 특정 장소명이나 가게 이름을 찾을 때 사용합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "검색할 장소명 또는 키워드 (예: '스타벅스 강남점', '경복궁')"
                },
                "location": {
                    "type": "string",
                    "description": "검색 중심 위치 (예: '강남역'). 없으면 서울 전체"
                },
                "limit": {
                    "type": "integer",
                    "description": "최대 결과 수 (기본값: 5)",
                    "default": 5
                }
            },
            "required": ["keyword"]
        }
    },
    {
        "name": "get_landmarks",
        "description": "특정 지역의 필수 명소/랜드마크를 조회합니다. 관광 필수 코스를 알고 싶을 때 사용합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "지역명 (예: '명동', '홍대', '강남')"
                },
                "limit": {
                    "type": "integer",
                    "description": "최대 결과 수 (기본값: 5)",
                    "default": 5
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_random_poi",
        "description": "무작위로 POI를 추천합니다. 사용자가 어디를 갈지 모를 때, 심심할 때 사용합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_lat": {
                    "type": "number",
                    "description": "사용자 위도 (선택)"
                },
                "user_lng": {
                    "type": "number",
                    "description": "사용자 경도 (선택)"
                }
            }
        }
    },
    {
        "name": "get_poi_detail",
        "description": "특정 POI의 상세 정보를 조회합니다. content_id가 필요합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "POI의 content_id"
                }
            },
            "required": ["content_id"]
        }
    }
]


# ============================================================================
# 도구 함수들
# ============================================================================

async def search_poi_recommend(
    query_text: str,
    location: Optional[str] = None,
    emotions: Optional[List[str]] = None,
    category: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """감정 기반 POI 추천"""
    try:
        logger.info(f"[TOOL:search_poi_recommend] query={query_text}, location={location}, emotions={emotions}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "query_text": query_text,
                "preferences": {"emotions": emotions or []},
                "core_keywords": [category] if category else [],
                "limit": limit
            }

            # location이 있으면 geometry_id 조회 필요 (간단히 처리)
            if location:
                payload["location_keyword"] = location

            response = await client.post(
                f"{POI_SERVICE_URL}/api/recommend",
                json=payload
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "count": data.get("count", 0),
                    "pois": data.get("results", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"POI 서비스 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:search_poi_recommend] Error: {e}")
        return {"success": False, "error": str(e)}


async def search_poi_google(
    keyword: str,
    location: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """Google Places 검색"""
    try:
        logger.info(f"[TOOL:search_poi_google] keyword={keyword}, location={location}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "keyword": keyword,
                "limit": limit,
                "language": "ko"
            }

            # 위치 정보 추가
            if location:
                payload["location_keyword"] = location

            response = await client.post(
                f"{POI_SERVICE_URL}/api/google/search",
                json=payload
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "count": len(data.get("places", [])),
                    "places": data.get("places", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"Google Places 서비스 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:search_poi_google] Error: {e}")
        return {"success": False, "error": str(e)}


async def get_landmarks(
    location: str,
    limit: int = 5
) -> Dict[str, Any]:
    """필수 명소 조회"""
    try:
        logger.info(f"[TOOL:get_landmarks] location={location}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{POI_SERVICE_URL}/api/landmark",
                json={
                    "location_keyword": location,
                    "limit": limit
                }
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "location": location,
                    "count": data.get("count", 0),
                    "landmarks": data.get("landmarks", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"Landmark 서비스 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:get_landmarks] Error: {e}")
        return {"success": False, "error": str(e)}


async def get_random_poi(
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None
) -> Dict[str, Any]:
    """랜덤 POI 추천"""
    try:
        logger.info(f"[TOOL:get_random_poi] lat={user_lat}, lng={user_lng}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {}
            if user_lat is not None:
                params["lat"] = user_lat
            if user_lng is not None:
                params["lng"] = user_lng

            response = await client.get(
                f"{POI_SERVICE_URL}/api/random",
                params=params
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "poi": data.get("poi")
                }
            else:
                return {
                    "success": False,
                    "error": f"Random POI 서비스 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:get_random_poi] Error: {e}")
        return {"success": False, "error": str(e)}


async def get_poi_detail(content_id: str) -> Dict[str, Any]:
    """POI 상세 정보 조회"""
    try:
        logger.info(f"[TOOL:get_poi_detail] content_id={content_id}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{POI_SERVICE_URL}/api/kto/detail/{content_id}"
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "detail": data
                }
            else:
                return {
                    "success": False,
                    "error": f"POI 상세 조회 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:get_poi_detail] Error: {e}")
        return {"success": False, "error": str(e)}
