"""
Beaty Service - Tools Registry
모든 도구 정의 및 등록
"""

from typing import List, Dict, Any, Callable
from tools.poi_tools import (
    search_poi_recommend,
    search_poi_google,
    get_landmarks,
    get_random_poi,
    get_poi_detail,
    TOOL_DEFINITIONS as POI_TOOL_DEFINITIONS
)
from tools.route_tools import (
    search_route,
    TOOL_DEFINITIONS as ROUTE_TOOL_DEFINITIONS
)
from tools.weather_tools import (
    get_weather,
    get_weather_detailed,
    TOOL_DEFINITIONS as WEATHER_TOOL_DEFINITIONS
)

# 모든 도구 정의 통합
ALL_TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    *POI_TOOL_DEFINITIONS,
    *ROUTE_TOOL_DEFINITIONS,
    *WEATHER_TOOL_DEFINITIONS,
]

# 도구 이름 → 함수 매핑
TOOL_FUNCTIONS: Dict[str, Callable] = {
    # POI 도구
    "search_poi_recommend": search_poi_recommend,
    "search_poi_google": search_poi_google,
    "get_landmarks": get_landmarks,
    "get_random_poi": get_random_poi,
    "get_poi_detail": get_poi_detail,
    # 경로 도구
    "search_route": search_route,
    # 날씨 도구
    "get_weather": get_weather,
    "get_weather_detailed": get_weather_detailed,
}


def get_all_tools() -> List[Dict[str, Any]]:
    """OpenAI 형식의 모든 도구 정의 반환"""
    return [{"type": "function", "function": tool} for tool in ALL_TOOL_DEFINITIONS]


async def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """도구 실행"""
    if tool_name not in TOOL_FUNCTIONS:
        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}"
        }

    try:
        func = TOOL_FUNCTIONS[tool_name]
        result = await func(**arguments)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
