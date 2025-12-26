"""
Google Geocoding API - 주소/장소명을 위경도로 변환
"""

import httpx
from typing import Optional, Dict, Any


class GoogleGeocoder:
    """Google Geocoding API 클라이언트"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"

    async def geocode(self, address: str, language: str = "ko") -> Optional[Dict[str, Any]]:
        """
        주소/장소명을 위경도로 변환

        Args:
            address: 주소 또는 장소명 ("경복궁", "서울시 종로구...")
            language: 응답 언어 (기본: ko)

        Returns:
            {
                "lat": 37.5796,
                "lng": 126.9770,
                "formatted_address": "대한민국 서울특별시 종로구 사직로 161",
                "place_id": "ChIJ..."
            }
            또는 None (실패 시)
        """
        try:
            print(f"[GEOCODER] Geocoding: '{address}'")

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "address": address,
                        "language": language,
                        "key": self.api_key
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

            if data.get("status") != "OK":
                print(f"[GEOCODER] Error: {data.get('status')} - {data.get('error_message', 'N/A')}")
                return None

            results = data.get("results", [])
            if not results:
                print(f"[GEOCODER] No results found for: '{address}'")
                return None

            # 첫 번째 결과 사용
            result = results[0]
            location = result["geometry"]["location"]

            geocoded = {
                "lat": location["lat"],
                "lng": location["lng"],
                "formatted_address": result.get("formatted_address", ""),
                "place_id": result.get("place_id", "")
            }

            print(f"[GEOCODER] Success: {geocoded['formatted_address']} ({geocoded['lat']:.4f}, {geocoded['lng']:.4f})")
            return geocoded

        except Exception as e:
            print(f"[GEOCODER] Exception: {e}")
            import traceback
            traceback.print_exc()
            return None
