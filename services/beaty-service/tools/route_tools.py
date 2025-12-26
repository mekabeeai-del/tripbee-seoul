"""
경로 검색 도구
- route-service (8002) 호출
"""

import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

ROUTE_SERVICE_URL = "http://localhost:8002"


# ============================================================================
# 도구 정의
# ============================================================================

TOOL_DEFINITIONS = [
    {
        "name": "search_route",
        "description": "출발지에서 도착지까지의 대중교통 경로를 검색합니다. 지하철, 버스 등의 최적 경로를 제공합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "origin": {
                    "type": "string",
                    "description": "출발지 장소명 (예: '강남역', '서울역'). 없으면 사용자 현재 위치 사용"
                },
                "destination": {
                    "type": "string",
                    "description": "도착지 장소명 (예: '경복궁', '홍대입구역')"
                },
                "origin_coords": {
                    "type": "object",
                    "properties": {
                        "lat": {"type": "number"},
                        "lng": {"type": "number"}
                    },
                    "description": "출발지 좌표 (origin 대신 사용 가능)"
                },
                "destination_coords": {
                    "type": "object",
                    "properties": {
                        "lat": {"type": "number"},
                        "lng": {"type": "number"}
                    },
                    "description": "도착지 좌표 (destination 대신 사용 가능)"
                },
                "route_preference": {
                    "type": "string",
                    "enum": ["fastest", "min_transfer", "min_walk"],
                    "description": "경로 우선순위. fastest=최단시간, min_transfer=최소환승, min_walk=최소도보. 기본값: fastest"
                },
                "transportation_mode": {
                    "type": "string",
                    "enum": ["subway", "bus"],
                    "description": "교통수단 필터. subway=지하철만, bus=버스만. 없으면 전체"
                }
            },
            "required": ["destination"]
        }
    }
]


# ============================================================================
# 도구 함수
# ============================================================================

async def search_route(
    destination: str,
    origin: Optional[str] = None,
    origin_coords: Optional[Dict[str, float]] = None,
    destination_coords: Optional[Dict[str, float]] = None,
    route_preference: str = "fastest",
    transportation_mode: Optional[str] = None
) -> Dict[str, Any]:
    """대중교통 경로 검색"""
    try:
        logger.info(f"[TOOL:search_route] origin={origin}, destination={destination}")

        # 좌표 정보 구성
        origin_data = None
        destination_data = None

        if origin_coords:
            origin_data = {"lat": origin_coords["lat"], "lng": origin_coords["lng"]}
        elif origin:
            # 장소명을 좌표로 변환 필요 - route-service에서 처리
            origin_data = {"keyword": origin}

        if destination_coords:
            destination_data = {"lat": destination_coords["lat"], "lng": destination_coords["lng"]}
        else:
            destination_data = {"keyword": destination}

        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "origin": origin_data,
                "destination": destination_data,
                "route_preference": route_preference
            }

            if transportation_mode:
                payload["transportation_mode"] = transportation_mode

            response = await client.post(
                f"{ROUTE_SERVICE_URL}/api/route",
                json=payload
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "origin": origin or "현재 위치",
                    "destination": destination,
                    "paths": data.get("paths", []),
                    "summary": data.get("summary"),
                    "geojson": data.get("geojson")
                }
            else:
                return {
                    "success": False,
                    "error": f"경로 검색 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:search_route] Error: {e}")
        return {"success": False, "error": str(e)}
