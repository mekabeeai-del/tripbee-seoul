"""
LangChain Tools - 기존 마이크로서비스 래핑
각 도구는 기존 서비스를 HTTP로 호출하여 결과 반환
"""

import httpx
from typing import Optional, Dict, Any
from langchain.tools import BaseTool
from pydantic import BaseModel, Field


# ============================================================================
# TOOL 1: RecommendTool - POI 추천
# ============================================================================

class RecommendInput(BaseModel):
    """POI 추천 도구 입력 스키마"""
    category_text: str = Field(description="카테고리 (예: 맛집, 일식집, 라멘, 카페, 관광지 등)")
    location_keyword: Optional[str] = Field(default=None, description="위치 키워드 (예: 홍대, 명동, 경복궁)")
    emotion: Optional[str] = Field(default=None, description="감정/분위기 (예: 힐링, 조용한, 예쁜)")
    user_lat: Optional[float] = Field(default=None, description="사용자 위도")
    user_lng: Optional[float] = Field(default=None, description="사용자 경도")


class RecommendTool(BaseTool):
    """POI 추천 도구 - poi-service (recommend) 호출"""

    name: str = "recommend_poi"
    description: str = """서울 POI(관광지, 맛집 등) 추천 도구.
사용자가 "추천해줘", "좋은 곳", "가볼만한" 등을 요청할 때 사용.
카테고리, 위치, 감정 등을 기반으로 추천.
예시: "홍대 일식집 추천", "명동 카페 추천", "힐링되는 관광지"
"""
    args_schema: type[BaseModel] = RecommendInput

    service_url: str = "http://localhost:8001"  # poi-service (recommend)

    def _run(
        self,
        category_text: str,
        location_keyword: Optional[str] = None,
        emotion: Optional[str] = None,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None
    ) -> str:
        """POI 추천 실행"""
        try:
            # 요청 페이로드 구성
            payload = {
                "slots": {
                    "category_text": category_text,
                    "location_keyword": location_keyword,
                    "emotion": emotion
                }
            }

            if user_lat and user_lng:
                payload["user_location"] = {
                    "lat": user_lat,
                    "lng": user_lng
                }

            print(f"[RECOMMEND_TOOL] 요청: {payload}")

            # poi-service 호출
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.service_url}/api/recommend",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            print(f"[RECOMMEND_TOOL] 응답: {len(result.get('pois', []))}개 POI")

            # 결과 포맷팅
            pois = result.get("pois", [])
            if not pois:
                return "추천할 만한 장소를 찾지 못했어요. 다른 조건으로 다시 시도해볼까요?"

            # 상위 5개만 텍스트로 반환
            poi_texts = []
            for i, poi in enumerate(pois[:5], 1):
                title = poi.get("title", "이름 없음")
                addr = poi.get("addr1", "주소 정보 없음")
                cat = poi.get("cat3", "카테고리 정보 없음")
                poi_texts.append(f"{i}. {title} ({cat}) - {addr}")

            # JSON 형태로 반환 (Agent가 파싱 가능하도록)
            import json
            return json.dumps({
                "text": "\n".join([
                    f"총 {len(pois)}개의 장소를 찾았어요!",
                    "추천 목록:",
                    *poi_texts
                ]),
                "data": {
                    "pois": pois  # 원본 데이터 포함
                }
            }, ensure_ascii=False)

        except httpx.HTTPStatusError as e:
            print(f"[RECOMMEND_TOOL] HTTP 오류: {e}")
            return f"추천 서비스 오류가 발생했어요: {e.response.status_code}"
        except Exception as e:
            print(f"[RECOMMEND_TOOL] 오류: {e}")
            return f"추천 도구 실행 중 오류가 발생했어요: {str(e)}"

    async def _arun(self, *args, **kwargs):
        """비동기 실행 (현재는 동기 버전 호출)"""
        return self._run(*args, **kwargs)


# ============================================================================
# TOOL 2: RouteTool - 대중교통 경로 검색
# ============================================================================

class RouteInput(BaseModel):
    """경로 검색 도구 입력 스키마"""
    destination_keyword: str = Field(description="도착지 장소명 (필수)")
    origin_keyword: Optional[str] = Field(default=None, description="출발지 장소명 (없으면 사용자 위치)")
    transportation_mode: Optional[str] = Field(default=None, description="교통수단 (subway, bus, null)")
    user_lat: Optional[float] = Field(default=None, description="사용자 위도")
    user_lng: Optional[float] = Field(default=None, description="사용자 경도")


class RouteTool(BaseTool):
    """대중교통 경로 검색 도구 - route-service 호출"""

    name: str = "search_route"
    description: str = """대중교통 경로 검색 도구 (ODSay API).
사용자가 "어떻게 가?", "가는 길", "경로" 등을 요청할 때 사용.
출발지와 도착지 사이의 지하철/버스 경로 제공.
예시: "홍대까지 어떻게 가?", "경복궁에서 명동 가는 길"
"""
    args_schema: type[BaseModel] = RouteInput

    service_url: str = "http://localhost:8002"  # route-service

    def _run(
        self,
        destination_keyword: str,
        origin_keyword: Optional[str] = None,
        transportation_mode: Optional[str] = None,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None
    ) -> str:
        """경로 검색 실행"""
        try:
            payload = {
                "slots": {
                    "destination_keyword": destination_keyword,
                    "origin_keyword": origin_keyword,
                    "transportation_mode": transportation_mode
                }
            }

            if user_lat and user_lng:
                payload["user_location"] = {
                    "lat": user_lat,
                    "lng": user_lng
                }

            print(f"[ROUTE_TOOL] 요청: {payload}")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.service_url}/api/search",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            routes = result.get("routes", [])
            if not routes:
                return "경로를 찾지 못했어요. 출발지나 도착지를 다시 확인해주세요."

            # 상위 3개 경로만 요약
            route_texts = []
            for i, route in enumerate(routes[:3], 1):
                time = route.get("totalTime", 0)
                distance = route.get("totalDistance", 0)
                route_texts.append(f"{i}. 소요시간 {time}분, 거리 {distance}m")

            # JSON 형태로 반환
            import json
            return json.dumps({
                "text": "\n".join([
                    f"총 {len(routes)}개 경로를 찾았어요!",
                    *route_texts
                ]),
                "data": {
                    "routes": routes  # 원본 데이터 포함
                }
            }, ensure_ascii=False)

        except httpx.HTTPStatusError as e:
            print(f"[ROUTE_TOOL] HTTP 오류: {e}")
            return f"경로 검색 오류: {e.response.status_code}"
        except Exception as e:
            print(f"[ROUTE_TOOL] 오류: {e}")
            return f"경로 검색 중 오류: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


# ============================================================================
# TOOL 3: FindPlaceTool - Google Places 검색
# ============================================================================

class FindPlaceInput(BaseModel):
    """장소 검색 도구 입력 스키마"""
    query: str = Field(description="검색 쿼리 (장소명 + 카테고리)")
    user_lat: Optional[float] = Field(default=None, description="사용자 위도")
    user_lng: Optional[float] = Field(default=None, description="사용자 경도")


class FindPlaceTool(BaseTool):
    """Google Places 검색 도구 - poi-service 호출"""

    name: str = "find_place"
    description: str = """Google Places API 기반 장소 검색 도구.
특정 장소 이름이나 편의점, 카페 등 근처 장소를 찾을 때 사용.
다국어 지원 및 상세 정보 제공.
예시: "근처에 편의점", "스타벅스 홍대점", "명동교자"
"""
    args_schema: type[BaseModel] = FindPlaceInput

    service_url: str = "http://localhost:8001"  # poi-service

    def _run(
        self,
        query: str,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None
    ) -> str:
        """장소 검색 실행"""
        try:
            # 사용자 위치 기본값 (서울 시청)
            if not user_lat or not user_lng:
                user_lat = 37.5665
                user_lng = 126.9780

            payload = {
                "keyword": query,
                "user_lat": user_lat,
                "user_lng": user_lng,
                "limit": 5,
                "language": "ko"
            }

            print(f"[FINDPLACE_TOOL] 요청: {payload}")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.service_url}/api/google/search",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            places = result.get("results", [])
            if not places:
                return f"'{query}'에 대한 검색 결과가 없어요."

            # 상위 5개만
            place_texts = []
            for i, place in enumerate(places[:5], 1):
                name = place.get("name", "이름 없음")
                addr = place.get("formatted_address", "주소 정보 없음")
                place_texts.append(f"{i}. {name} - {addr}")

            # JSON 형태로 반환 (Agent가 파싱 가능하도록)
            import json
            return json.dumps({
                "text": "\n".join([
                    f"총 {len(places)}개 장소를 찾았어요!",
                    *place_texts
                ]),
                "data": {
                    "places": places  # 원본 데이터 포함
                }
            }, ensure_ascii=False)

        except httpx.HTTPStatusError as e:
            print(f"[FINDPLACE_TOOL] HTTP 오류: {e}")
            return f"장소 검색 오류: {e.response.status_code}"
        except Exception as e:
            print(f"[FINDPLACE_TOOL] 오류: {e}")
            return f"장소 검색 중 오류: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


# ============================================================================
# TOOL 4: LandmarkTool - 랜드마크 조회
# ============================================================================

class LandmarkInput(BaseModel):
    """랜드마크 조회 도구 입력 스키마"""
    pass  # 파라미터 없음


class LandmarkTool(BaseTool):
    """랜드마크 POI 조회 도구 - landmark-service 호출"""

    name: str = "get_landmark"
    description: str = """서울 주요 랜드마크/관광지 조회 도구.
사용자가 "랜드마크", "유명한 곳", "관광 명소" 등을 요청할 때 사용.
KTO 데이터 기반 주요 관광지 제공.
예시: "서울 랜드마크 보여줘", "유명한 관광지"
"""
    args_schema: type[BaseModel] = LandmarkInput

    service_url: str = "http://localhost:8004"  # landmark-service

    def _run(self) -> str:
        """랜드마크 조회 실행"""
        try:
            print(f"[LANDMARK_TOOL] 요청")

            with httpx.Client(timeout=30.0) as client:
                response = client.get(f"{self.service_url}/api/landmarks")
                response.raise_for_status()
                result = response.json()

            pois = result.get("pois", [])
            if not pois:
                return "랜드마크 정보를 가져오지 못했어요."

            # 상위 10개
            poi_texts = []
            for i, poi in enumerate(pois[:10], 1):
                title = poi.get("title", "이름 없음")
                cat = poi.get("cat3", "")
                poi_texts.append(f"{i}. {title} ({cat})")

            # JSON 형태로 반환
            import json
            return json.dumps({
                "text": "\n".join([
                    f"서울 주요 랜드마크 {len(pois[:10])}곳:",
                    *poi_texts
                ]),
                "data": {
                    "pois": pois[:10]  # 원본 데이터 포함
                }
            }, ensure_ascii=False)

        except httpx.HTTPStatusError as e:
            print(f"[LANDMARK_TOOL] HTTP 오류: {e}")
            return f"랜드마크 조회 오류: {e.response.status_code}"
        except Exception as e:
            print(f"[LANDMARK_TOOL] 오류: {e}")
            return f"랜드마크 조회 중 오류: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


# ============================================================================
# TOOL 5: RandomPOITool - 랜덤 POI 추천
# ============================================================================

class RandomPOIInput(BaseModel):
    """랜덤 POI 추천 도구 입력 스키마"""
    user_lat: Optional[float] = Field(default=None, description="사용자 위도")
    user_lng: Optional[float] = Field(default=None, description="사용자 경도")


class RandomPOITool(BaseTool):
    """랜덤 POI 추천 도구 - random-poi-service 호출"""

    name: str = "random_poi"
    description: str = """무작위 POI 추천 도구.
사용자가 "아무데나", "심심해", "뭐 할까" 등을 요청할 때 사용.
사용자 위치 기반 무작위 추천.
예시: "심심한데 어디 갈까", "아무데나 가고 싶어"
"""
    args_schema: type[BaseModel] = RandomPOIInput

    service_url: str = "http://localhost:8006"  # random-poi-service

    def _run(
        self,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None
    ) -> str:
        """랜덤 POI 추천 실행"""
        try:
            payload = {}
            if user_lat and user_lng:
                payload["user_location"] = {
                    "lat": user_lat,
                    "lng": user_lng
                }

            print(f"[RANDOM_POI_TOOL] 요청: {payload}")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.service_url}/api/random",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            poi = result.get("poi")
            if not poi:
                return "랜덤 장소를 찾지 못했어요."

            title = poi.get("title", "이름 없음")
            addr = poi.get("addr1", "주소 정보 없음")
            cat = poi.get("cat3", "")
            description = poi.get("beaty_intro", "")

            # JSON 형태로 반환
            import json
            return json.dumps({
                "text": f"여기 어때요?\n\n{title} ({cat})\n{addr}\n\n{description}",
                "data": {
                    "poi": poi  # 원본 데이터 포함
                }
            }, ensure_ascii=False)

        except httpx.HTTPStatusError as e:
            print(f"[RANDOM_POI_TOOL] HTTP 오류: {e}")
            return f"랜덤 추천 오류: {e.response.status_code}"
        except Exception as e:
            print(f"[RANDOM_POI_TOOL] 오류: {e}")
            return f"랜덤 추천 중 오류: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)
