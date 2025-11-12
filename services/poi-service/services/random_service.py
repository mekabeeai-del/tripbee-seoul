"""
Random POI Service - 랜덤 장소 추천 서비스
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel
from openai import OpenAI
from config import CONFIG
from utils.db import get_sync_db_connection


# =====================================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================================

class RandomPoiRequest(BaseModel):
    """랜덤 POI 요청"""
    lat: Optional[float] = None
    lng: Optional[float] = None


# =====================================================================================
# RANDOM POI SERVICE
# =====================================================================================

class RandomPoiService:
    """랜덤 POI 추천 서비스"""

    def __init__(self):
        self.client = OpenAI(api_key=CONFIG["openai_api_key"])

    def get_random_poi(self, lat: Optional[float] = None, lng: Optional[float] = None) -> Dict[str, Any]:
        """
        랜덤 POI 조회 및 Beaty 소개

        Args:
            lat: 사용자 위치 위도 (optional)
            lng: 사용자 위치 경도 (optional)
            - lat/lng가 제공되면 반경 1.5km 이내의 POI만 조회

        Returns:
            {
                "success": true,
                "poi": {
                    "content_id": "126508",
                    "title": "경복궁",
                    "addr1": "서울특별시 종로구 ...",
                    "mapx": 126.9770,
                    "mapy": 37.5796,
                    "first_image": "http://...",
                    "overview": "...",
                    "beaty_description": "비티가 소개하는 2줄 설명"
                }
            }
        """
        try:
            if lat is not None and lng is not None:
                print(f"[RANDOM_POI] 랜덤 POI 요청 (반경 1.5km, 사용자 위치: {lat}, {lng})")
            else:
                print("[RANDOM_POI] 랜덤 POI 요청 (전체 지역)")

            conn = get_sync_db_connection()
            cursor = conn.cursor()

            # KTO_TOUR_BASE_LIST에서 랜덤으로 1개 선택
            # 조건: language = 'Kor' (한국어), mapx, mapy, title이 있고, overview가 있는 것
            # + 사용자 위치가 있으면 반경 1.5km 이내 필터링

            if lat is not None and lng is not None:
                # Haversine 거리 계산 (단위: 미터)
                query = """
                    SELECT
                        content_id,
                        title,
                        addr1,
                        mapx,
                        mapy,
                        first_image,
                        overview,
                        content_type_id,
                        cat1,
                        cat2,
                        cat3,
                        (6371000 * acos(
                            cos(radians(%s)) * cos(radians(mapy)) *
                            cos(radians(mapx) - radians(%s)) +
                            sin(radians(%s)) * sin(radians(mapy))
                        )) AS distance
                    FROM KTO_TOUR_BASE_LIST
                    WHERE
                        language = 'Kor'
                        AND mapx IS NOT NULL
                        AND mapy IS NOT NULL
                        AND title IS NOT NULL
                        AND overview IS NOT NULL
                        AND LENGTH(overview) > 50
                        AND (6371000 * acos(
                            cos(radians(%s)) * cos(radians(mapy)) *
                            cos(radians(mapx) - radians(%s)) +
                            sin(radians(%s)) * sin(radians(mapy))
                        )) <= 1500
                    ORDER BY RANDOM()
                    LIMIT 1
                """
                cursor.execute(query, [lat, lng, lat, lat, lng, lat])
            else:
                # 전체 지역에서 랜덤 선택
                query = """
                    SELECT
                        content_id,
                        title,
                        addr1,
                        mapx,
                        mapy,
                        first_image,
                        overview,
                        content_type_id,
                        cat1,
                        cat2,
                        cat3
                    FROM KTO_TOUR_BASE_LIST
                    WHERE
                        language = 'Kor'
                        AND mapx IS NOT NULL
                        AND mapy IS NOT NULL
                        AND title IS NOT NULL
                        AND overview IS NOT NULL
                        AND LENGTH(overview) > 50
                    ORDER BY RANDOM()
                    LIMIT 1
                """
                cursor.execute(query)

            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if not result:
                raise Exception("POI를 찾을 수 없습니다")

            print(f"[RANDOM_POI] 선택된 POI: {result['title']}")

            # GPT-4o-mini로 Beaty 소개 생성
            try:
                beaty_prompt = f"""당신은 서울 여행 가이드 '비티(Beaty)'입니다.
귀엽고 친근한 말투로 장소를 소개해주세요.

장소명: {result['title']}
주소: {result['addr1']}
설명: {result['overview'][:200]}

위 정보를 바탕으로 **2줄 이내**로 간단히 소개해주세요.
장소명은 그대로 유지하고, 친근하고 매력적으로 설명해주세요.
"~예요", "~해요" 같은 존댓말 반말 섞인 톤으로 해주세요."""

                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "당신은 귀엽고 친근한 서울 여행 가이드 비티입니다."},
                        {"role": "user", "content": beaty_prompt}
                    ],
                    temperature=0.8,
                    max_tokens=150
                )

                beaty_description = response.choices[0].message.content.strip()
                print(f"[RANDOM_POI] Beaty 소개: {beaty_description}")

            except Exception as e:
                print(f"[ERROR] GPT 호출 실패: {e}")
                beaty_description = f"{result['title']}은(는) 서울의 멋진 장소예요! 한번 가보실래요?"

            return {
                "success": True,
                "poi": {
                    "content_id": result["content_id"],
                    "title": result["title"],
                    "addr1": result["addr1"],
                    "mapx": float(result["mapx"]) if result["mapx"] else None,
                    "mapy": float(result["mapy"]) if result["mapy"] else None,
                    "first_image": result["first_image"],
                    "overview": result["overview"],
                    "content_type_id": result["content_type_id"],
                    "cat1": result["cat1"],
                    "cat2": result["cat2"],
                    "cat3": result["cat3"],
                    "beaty_description": beaty_description
                }
            }

        except Exception as e:
            print(f"[ERROR] {e}")
            import traceback
            traceback.print_exc()
            raise
