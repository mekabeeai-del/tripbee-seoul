"""
KTO Service - KTO 관광 데이터 제공 서비스
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from utils.db import get_sync_db_connection


# =====================================================================================
# RESPONSE MODELS
# =====================================================================================

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


# =====================================================================================
# KTO SERVICE
# =====================================================================================

class KtoService:
    """KTO 관광 데이터베이스 서비스"""

    def __init__(self):
        pass

    def get_all_metadata(self) -> List[Dict[str, Any]]:
        """
        모든 POI 메타데이터 조회 (경량)

        클라이언트에서 전체 로드 후 BBOX/Zoom 필터링에 사용
        같은 좌표에 여러 POI가 있으면 content_type_id가 낮은 것만 선택

        Returns:
            [
                {
                    "content_id": "126508",
                    "title": "경복궁",
                    "lat": 37.5796,
                    "lng": 126.9770,
                    "cat1": "A02",
                    "cat2": "A0201",
                    "cat3": "A02010100",
                    "content_type_id": "12",
                    "addr1": "서울특별시 종로구...",
                    "first_image": "http://..."
                }
            ]
        """
        try:
            print(f"[KTO] 전체 POI 메타데이터 조회 요청")

            conn = get_sync_db_connection()
            cursor = conn.cursor()

            # 경량 메타데이터만 조회 (overview 제외)
            # 같은 좌표에 여러 POI가 있으면 content_type_id가 낮은 것만 선택
            query = """
                WITH ranked_pois AS (
                    SELECT
                        content_id,
                        title,
                        mapy as lat,
                        mapx as lng,
                        cat1,
                        cat2,
                        cat3,
                        content_type_id,
                        addr1,
                        first_image,
                        ROW_NUMBER() OVER (
                            PARTITION BY mapx, mapy
                            ORDER BY CAST(content_type_id AS INTEGER) ASC NULLS LAST
                        ) as rn
                    FROM KTO_TOUR_BASE_LIST
                    WHERE
                        language = 'Kor'
                        AND mapx IS NOT NULL
                        AND mapy IS NOT NULL
                        AND title IS NOT NULL
                        AND content_type_id IS NOT NULL
                )
                SELECT
                    content_id,
                    title,
                    lat,
                    lng,
                    cat1,
                    cat2,
                    cat3,
                    content_type_id,
                    addr1,
                    first_image
                FROM ranked_pois
                WHERE rn = 1
                ORDER BY content_id
            """

            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            conn.close()

            # float 변환
            pois = []
            for row in results:
                pois.append({
                    "content_id": row["content_id"],
                    "title": row["title"],
                    "lat": float(row["lat"]) if row["lat"] else None,
                    "lng": float(row["lng"]) if row["lng"] else None,
                    "cat1": row["cat1"],
                    "cat2": row["cat2"],
                    "cat3": row["cat3"],
                    "content_type_id": row["content_type_id"],
                    "addr1": row["addr1"],
                    "first_image": row["first_image"]
                })

            print(f"[KTO] {len(pois)}개 POI 메타데이터 반환")

            return pois

        except Exception as e:
            print(f"[ERROR] {e}")
            import traceback
            traceback.print_exc()
            raise

    def get_poi_detail(self, content_id: str) -> Dict[str, Any]:
        """
        특정 POI 상세 정보 조회

        마커 클릭 시 상세 정보(overview, images 등)를 가져올 때 사용

        Args:
            content_id: POI content_id

        Returns:
            {
                "content_id": "126508",
                "title": "경복궁",
                "addr1": "서울특별시 종로구...",
                "lat": 37.5796,
                "lng": 126.9770,
                "first_image": "http://...",
                "overview": "조선 왕조의 법궁...",
                "content_type_id": "12",
                "cat1": "A02",
                "cat2": "A0201",
                "cat3": "A02010100",
                "common_data": {...},
                "intro_data": {...},
                "repeat_data": {...},
                "images_data": {...}
            }
        """
        try:
            print(f"[KTO] POI 상세 조회: {content_id}")

            conn = get_sync_db_connection()
            cursor = conn.cursor()

            query = """
                SELECT
                    content_id,
                    title,
                    addr1,
                    mapy as lat,
                    mapx as lng,
                    first_image,
                    overview,
                    content_type_id,
                    cat1,
                    cat2,
                    cat3,
                    common_data,
                    intro_data,
                    repeat_data,
                    images_data
                FROM KTO_TOUR_BASE_LIST
                WHERE
                    content_id = %s
                    AND language = 'Kor'
            """

            cursor.execute(query, [content_id])
            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if not result:
                raise Exception(f"POI를 찾을 수 없습니다: {content_id}")

            # Debug: JSONB 필드 확인
            print(f"[DEBUG] common_data type: {type(result['common_data'])}, value: {result['common_data']}")
            print(f"[DEBUG] intro_data type: {type(result['intro_data'])}, value: {result['intro_data']}")
            print(f"[DEBUG] repeat_data type: {type(result['repeat_data'])}, value: {result['repeat_data']}")
            print(f"[DEBUG] images_data type: {type(result['images_data'])}, value: {result['images_data']}")

            poi_detail = {
                "content_id": result["content_id"],
                "title": result["title"],
                "addr1": result["addr1"],
                "lat": float(result["lat"]) if result["lat"] else None,
                "lng": float(result["lng"]) if result["lng"] else None,
                "first_image": result["first_image"],
                "overview": result["overview"],
                "content_type_id": result["content_type_id"],
                "cat1": result["cat1"],
                "cat2": result["cat2"],
                "cat3": result["cat3"],
                "common_data": result["common_data"],
                "intro_data": result["intro_data"],
                "repeat_data": result["repeat_data"],
                "images_data": result["images_data"]
            }

            print(f"[KTO] POI 상세 반환: {result['title']}")
            print(f"[KTO] Response keys: {list(poi_detail.keys())}")

            return poi_detail

        except Exception as e:
            print(f"[ERROR] {e}")
            import traceback
            traceback.print_exc()
            raise
