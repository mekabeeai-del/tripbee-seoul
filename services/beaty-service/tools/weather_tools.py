"""
날씨 도구
- OpenWeatherMap API 직접 호출
"""

import httpx
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# 설정 (나중에 config에서 로드)
OPENWEATHERMAP_API_KEY = "f18ff6e06bc5bbf01a424a43f232e30c"
SEOUL_LAT = 37.5665
SEOUL_LNG = 126.9780


# ============================================================================
# 도구 정의
# ============================================================================

TOOL_DEFINITIONS = [
    {
        "name": "get_weather",
        "description": "서울의 현재 날씨 정보를 조회합니다. 기온, 날씨 상태, 습도 등을 제공합니다.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_weather_detailed",
        "description": "서울의 상세 날씨 정보를 조회합니다. 현재 날씨, 시간별 예보, 일출/일몰 시간을 포함합니다.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]


# ============================================================================
# 헬퍼 함수
# ============================================================================

def get_weather_emoji(weather_id: int, is_day: bool = True) -> str:
    """날씨 ID에 따른 이모지 반환"""
    if weather_id >= 200 and weather_id < 300:
        return "⛈️"  # 뇌우
    elif weather_id >= 300 and weather_id < 400:
        return "🌧️"  # 이슬비
    elif weather_id >= 500 and weather_id < 600:
        return "🌧️"  # 비
    elif weather_id >= 600 and weather_id < 700:
        return "❄️"  # 눈
    elif weather_id >= 700 and weather_id < 800:
        return "🌫️"  # 안개
    elif weather_id == 800:
        return "☀️" if is_day else "🌙"  # 맑음
    elif weather_id > 800:
        return "☁️"  # 구름
    return "🌤️"


def get_sky_description(weather_id: int) -> str:
    """날씨 ID에 따른 한글 설명"""
    if weather_id >= 200 and weather_id < 300:
        return "뇌우"
    elif weather_id >= 300 and weather_id < 400:
        return "이슬비"
    elif weather_id >= 500 and weather_id < 600:
        return "비"
    elif weather_id >= 600 and weather_id < 700:
        return "눈"
    elif weather_id >= 700 and weather_id < 800:
        return "안개"
    elif weather_id == 800:
        return "맑음"
    elif weather_id == 801:
        return "구름 조금"
    elif weather_id == 802:
        return "구름 많음"
    elif weather_id >= 803:
        return "흐림"
    return "맑음"


# ============================================================================
# 도구 함수
# ============================================================================

async def get_weather() -> Dict[str, Any]:
    """현재 날씨 조회"""
    try:
        logger.info("[TOOL:get_weather] 서울 날씨 조회")

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": SEOUL_LAT,
                    "lon": SEOUL_LNG,
                    "appid": OPENWEATHERMAP_API_KEY,
                    "units": "metric",
                    "lang": "kr"
                }
            )

            if response.status_code == 200:
                data = response.json()
                weather_id = data["weather"][0]["id"]

                return {
                    "success": True,
                    "temperature": round(data["main"]["temp"]),
                    "feels_like": round(data["main"]["feels_like"]),
                    "humidity": data["main"]["humidity"],
                    "wind_speed": round(data["wind"]["speed"], 1),
                    "sky": get_sky_description(weather_id),
                    "emoji": get_weather_emoji(weather_id),
                    "description": data["weather"][0]["description"]
                }
            else:
                return {
                    "success": False,
                    "error": f"날씨 API 오류: {response.status_code}"
                }

    except Exception as e:
        logger.error(f"[TOOL:get_weather] Error: {e}")
        return {"success": False, "error": str(e)}


async def get_weather_detailed() -> Dict[str, Any]:
    """상세 날씨 조회 (시간별 예보 포함)"""
    try:
        logger.info("[TOOL:get_weather_detailed] 서울 상세 날씨 조회")

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 현재 날씨
            current_response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": SEOUL_LAT,
                    "lon": SEOUL_LNG,
                    "appid": OPENWEATHERMAP_API_KEY,
                    "units": "metric",
                    "lang": "kr"
                }
            )

            # 시간별 예보
            forecast_response = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": SEOUL_LAT,
                    "lon": SEOUL_LNG,
                    "appid": OPENWEATHERMAP_API_KEY,
                    "units": "metric",
                    "lang": "kr",
                    "cnt": 8  # 24시간 (3시간 간격)
                }
            )

            if current_response.status_code == 200 and forecast_response.status_code == 200:
                current_data = current_response.json()
                forecast_data = forecast_response.json()

                weather_id = current_data["weather"][0]["id"]

                # 일출/일몰 시간
                sunrise = datetime.fromtimestamp(current_data["sys"]["sunrise"]).strftime("%H:%M")
                sunset = datetime.fromtimestamp(current_data["sys"]["sunset"]).strftime("%H:%M")

                # 시간별 예보
                hourly = []
                for item in forecast_data["list"][:8]:
                    dt = datetime.fromtimestamp(item["dt"])
                    hourly.append({
                        "time": dt.strftime("%H:%M"),
                        "hour": f"{dt.hour}시",
                        "temperature": round(item["main"]["temp"]),
                        "emoji": get_weather_emoji(item["weather"][0]["id"])
                    })

                return {
                    "success": True,
                    "current": {
                        "temperature": round(current_data["main"]["temp"]),
                        "feels_like": round(current_data["main"]["feels_like"]),
                        "humidity": current_data["main"]["humidity"],
                        "wind_speed": round(current_data["wind"]["speed"], 1),
                        "sky": get_sky_description(weather_id),
                        "emoji": get_weather_emoji(weather_id),
                        "description": current_data["weather"][0]["description"]
                    },
                    "hourly": hourly,
                    "sunrise": sunrise,
                    "sunset": sunset
                }
            else:
                return {
                    "success": False,
                    "error": "날씨 API 오류"
                }

    except Exception as e:
        logger.error(f"[TOOL:get_weather_detailed] Error: {e}")
        return {"success": False, "error": str(e)}
