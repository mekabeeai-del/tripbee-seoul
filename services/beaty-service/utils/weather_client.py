"""
OpenWeatherMap API 클라이언트
"""
import requests
from datetime import datetime
from typing import Dict, Any, Optional


class WeatherClient:
    """OpenWeatherMap API 클라이언트"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        self.forecast_url = "https://api.openweathermap.org/data/2.5/forecast"  # 5일 예보 (3시간 간격)

    def get_current_weather(self, lat: float = 37.5665, lon: float = 126.9780) -> Optional[Dict[str, Any]]:
        """
        현재 날씨 정보 조회 (서울 중심 기준)

        Args:
            lat: 위도 (기본값: 서울 중심 37.5665)
            lon: 경도 (기본값: 서울 중심 126.9780)

        Returns:
            {
                "temperature": 18,  # 기온 (°C)
                "sky": "맑음",  # 하늘상태
                "precipitation": "없음",  # 강수형태
                "humidity": 60,  # 습도 (%)
                "wind_speed": 2.5,  # 풍속 (m/s)
                "emoji": "☀️"  # 날씨 이모지
            }
        """
        try:
            # API 요청 파라미터
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",  # 섭씨 온도
                "lang": "kr"  # 한국어
            }

            print(f"[WEATHER_CLIENT] 요청: lat={lat}, lon={lon}")

            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # 날씨 정보 추출
            temperature = round(data["main"]["temp"])
            humidity = data["main"]["humidity"]
            wind_speed = data["wind"]["speed"]

            # 날씨 상태 코드 (weather[0].id)
            weather_id = data["weather"][0]["id"]
            weather_main = data["weather"][0]["main"]
            weather_description = data["weather"][0]["description"]

            # 하늘상태 및 강수형태 파싱
            sky, precipitation = self._parse_weather(weather_id, weather_main)

            # 날씨 이모지 결정
            emoji = self._get_weather_emoji(weather_id, weather_main)

            result = {
                "temperature": temperature,
                "sky": sky,
                "precipitation": precipitation,
                "humidity": humidity,
                "wind_speed": wind_speed,
                "emoji": emoji
            }

            print(f"[WEATHER_CLIENT] 날씨 정보: {result}")
            return result

        except Exception as e:
            print(f"[WEATHER_CLIENT] 오류 발생: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _parse_weather(self, weather_id: int, weather_main: str) -> tuple:
        """
        OpenWeatherMap 날씨 코드를 하늘상태/강수형태로 변환

        Weather ID 범위:
        - 2xx: 천둥번개
        - 3xx: 이슬비
        - 5xx: 비
        - 6xx: 눈
        - 7xx: 대기 현상 (안개, 먼지 등)
        - 800: 맑음
        - 80x: 구름
        """
        # 강수형태
        if 200 <= weather_id < 300:  # 천둥번개
            precipitation = "천둥번개"
        elif 300 <= weather_id < 400:  # 이슬비
            precipitation = "이슬비"
        elif 500 <= weather_id < 600:  # 비
            precipitation = "비"
        elif 600 <= weather_id < 700:  # 눈
            if weather_id == 611 or weather_id == 612 or weather_id == 615 or weather_id == 616:
                precipitation = "진눈깨비"
            else:
                precipitation = "눈"
        else:
            precipitation = "없음"

        # 하늘상태
        if weather_id == 800:  # Clear
            sky = "맑음"
        elif weather_id == 801:  # Few clouds (11-25%)
            sky = "맑음"
        elif weather_id == 802:  # Scattered clouds (25-50%)
            sky = "구름조금"
        elif weather_id == 803:  # Broken clouds (51-84%)
            sky = "구름많음"
        elif weather_id == 804:  # Overcast clouds (85-100%)
            sky = "흐림"
        elif 700 <= weather_id < 800:  # 대기 현상
            sky = "흐림"
        else:
            sky = "흐림"

        return sky, precipitation

    def _get_weather_emoji(self, weather_id: int, weather_main: str) -> str:
        """날씨 상태에 따른 이모지 반환"""
        # 강수/특수 상태 우선
        if 200 <= weather_id < 300:  # 천둥번개
            return "⛈️"
        elif 300 <= weather_id < 400:  # 이슬비
            return "🌧️"
        elif 500 <= weather_id < 600:  # 비
            return "🌧️"
        elif 600 <= weather_id < 700:  # 눈
            if weather_id in [611, 612, 615, 616]:  # 진눈깨비
                return "🌨️"
            else:
                return "❄️"
        elif 700 <= weather_id < 800:  # 안개, 먼지 등
            return "🌫️"

        # 맑음/구름 (낮/밤 구분)
        hour = datetime.now().hour
        is_day = 6 <= hour < 18

        if weather_id == 800:  # 맑음
            return "☀️" if is_day else "🌙"
        elif weather_id == 801:  # 구름 조금
            return "🌤️" if is_day else "🌙"
        elif weather_id == 802:  # 구름 조금
            return "⛅"
        elif weather_id == 803:  # 구름 많음
            return "🌥️"
        elif weather_id == 804:  # 흐림
            return "☁️"

        return "☀️"  # 기본값

    def get_detailed_weather(self, lat: float = 37.5665, lon: float = 126.9780) -> Optional[Dict[str, Any]]:
        """
        상세 날씨 정보 조회 (현재 날씨 + 시간별 예보 + 일출/일몰)

        Returns:
            {
                "current": {...},  # 현재 날씨
                "hourly": [...],   # 시간별 예보 (24시간, 3시간 간격)
                "sunrise": "06:30",  # 일출 시각
                "sunset": "18:45"    # 일몰 시각
            }
        """
        try:
            # 1. 현재 날씨 (일출/일몰 포함)
            current_params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "kr"
            }

            current_response = requests.get(self.base_url, params=current_params, timeout=10)
            current_response.raise_for_status()
            current_data = current_response.json()

            # 현재 날씨 파싱
            temperature = round(current_data["main"]["temp"])
            feels_like = round(current_data["main"]["feels_like"])
            humidity = current_data["main"]["humidity"]
            wind_speed = current_data["wind"]["speed"]
            weather_id = current_data["weather"][0]["id"]
            weather_main = current_data["weather"][0]["main"]
            weather_description = current_data["weather"][0]["description"]

            sky, precipitation = self._parse_weather(weather_id, weather_main)
            emoji = self._get_weather_emoji(weather_id, weather_main)

            # 일출/일몰 (UTC → 한국시간 KST)
            from datetime import datetime, timezone, timedelta
            kst = timezone(timedelta(hours=9))
            sunrise_utc = datetime.fromtimestamp(current_data["sys"]["sunrise"], tz=timezone.utc)
            sunset_utc = datetime.fromtimestamp(current_data["sys"]["sunset"], tz=timezone.utc)
            sunrise_kst = sunrise_utc.astimezone(kst).strftime("%H:%M")
            sunset_kst = sunset_utc.astimezone(kst).strftime("%H:%M")

            current_weather = {
                "temperature": temperature,
                "feels_like": feels_like,
                "sky": sky,
                "precipitation": precipitation,
                "humidity": humidity,
                "wind_speed": wind_speed,
                "emoji": emoji,
                "description": weather_description
            }

            # 2. 시간별 예보 (3시간 간격, 24시간분만)
            forecast_params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "kr",
                "cnt": 8  # 8개 = 24시간 (3시간 * 8)
            }

            forecast_response = requests.get(self.forecast_url, params=forecast_params, timeout=10)
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()

            hourly_forecast = []
            for item in forecast_data["list"]:
                dt = datetime.fromtimestamp(item["dt"], tz=timezone.utc).astimezone(kst)
                temp = round(item["main"]["temp"])
                weather_id = item["weather"][0]["id"]
                weather_main = item["weather"][0]["main"]
                emoji = self._get_weather_emoji(weather_id, weather_main)

                hourly_forecast.append({
                    "time": dt.strftime("%H:%M"),
                    "hour": dt.strftime("%H시"),
                    "temperature": temp,
                    "emoji": emoji
                })

            result = {
                "current": current_weather,
                "hourly": hourly_forecast,
                "sunrise": sunrise_kst,
                "sunset": sunset_kst
            }

            print(f"[WEATHER_CLIENT] 상세 날씨 정보 조회 완료")
            return result

        except Exception as e:
            print(f"[WEATHER_CLIENT] 상세 날씨 조회 오류: {e}")
            import traceback
            traceback.print_exc()
            return None


# 테스트
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    from pathlib import Path

    load_dotenv()

    # Config에서 API 키 로드
    config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
        import re
        import json
        config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
        if config_match:
            config_str = '{' + config_match.group(1) + '}'
            config = json.loads(config_str.replace('\t', ''))
            weather_api_key = config.get("openweathermap_api_key", "")

    client = WeatherClient(weather_api_key)
    weather = client.get_current_weather()

    if weather:
        print("\n=== 날씨 정보 ===")
        print(f"온도: {weather['temperature']}°C")
        print(f"하늘: {weather['sky']}")
        print(f"강수: {weather['precipitation']}")
        print(f"습도: {weather['humidity']}%")
        print(f"풍속: {weather['wind_speed']}m/s")
        print(f"이모지: {weather['emoji']}")
