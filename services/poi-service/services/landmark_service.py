"""
Landmark Service - 필수 명소 제공 서비스
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from config import CONFIG
from utils.db import get_sync_db_connection


# =====================================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================================

class LandmarkRequest(BaseModel):
    """랜드마크 검색 요청"""
    location_keyword: str
    limit: Optional[int] = 10


# =====================================================================================
# LANDMARK SERVICE
# =====================================================================================

class LandmarkService:
    """필수 명소 제공 서비스"""

    def __init__(self):
        pass

    def get_landmarks(self, request: LandmarkRequest) -> Dict[str, Any]:
        """
        필수 명소 조회

        Args:
            request: 검색 요청 (location_keyword, limit)

        Returns:
            {
                "success": true,
                "location": "서울",
                "count": 10,
                "landmarks": [
                    {
                        "rank": 1,
                        "content_id": 126508,
                        "title": "경복궁",
                        "description": "조선시대 대표 궁궐",
                        "addr1": "서울특별시 종로구 ...",
                        "mapx": 126.9770,
                        "mapy": 37.5796,
                        "first_image": "http://..."
                    }
                ]
            }
        """
        try:
            location_keyword = request.location_keyword
            limit = request.limit or 10

            print(f"[LANDMARK] 요청: location={location_keyword}, limit={limit}")

            conn = get_sync_db_connection()
            cursor = conn.cursor()

            # LANDMARK_MAPPING과 KTO_TOUR_BASE_LIST 조인
            cursor.execute("""
                SELECT
                    lm.rank,
                    lm.content_id,
                    lm.description as landmark_description,
                    poi.title,
                    poi.addr1,
                    poi.mapx,
                    poi.mapy,
                    poi.first_image,
                    poi.overview,
                    poi.content_type_id,
                    poi.cat3
                FROM LANDMARK_MAPPING lm
                LEFT JOIN KTO_TOUR_BASE_LIST poi ON lm.content_id::VARCHAR = poi.content_id
                WHERE lm.location_keyword = %s
                ORDER BY lm.rank ASC
                LIMIT %s
            """, (location_keyword, limit))

            results = cursor.fetchall()
            cursor.close()
            conn.close()

            print(f"[LANDMARK] 결과: {len(results)}개 명소")

            return {
                "success": True,
                "location": location_keyword,
                "count": len(results),
                "landmarks": [
                    {
                        "rank": row["rank"],
                        "content_id": row["content_id"],
                        "title": row["title"],
                        "description": row["landmark_description"],
                        "addr1": row["addr1"],
                        "mapx": float(row["mapx"]) if row["mapx"] else None,
                        "mapy": float(row["mapy"]) if row["mapy"] else None,
                        "first_image": row["first_image"],
                        "overview": row["overview"],
                        "content_type_id": row["content_type_id"],
                        "cat3": row["cat3"]
                    }
                    for row in results
                ]
            }

        except Exception as e:
            print(f"[ERROR] {e}")
            import traceback
            traceback.print_exc()
            raise
