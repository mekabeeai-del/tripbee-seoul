"""
Recommend Service - POI 검색 엔진
CategoryVector + MasterPosition 결과를 받아 실제 POI 검색 수행
"""

import json
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from openai import OpenAI
from config import CONFIG
from utils.db import get_async_db_connection


# =====================================================================================
# REQUEST MODELS
# =====================================================================================

class UserLocation(BaseModel):
    lat: float
    lng: float


class RecommendRequest(BaseModel):
    query_text: str
    category_ids: Optional[List[str]] = None  # category_ids 배열 (우선순위순, 1~3개)
    geometry_id: Optional[int] = None
    user_location: Optional[UserLocation] = None
    filters: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, List[str]]] = None
    core_keywords: Optional[List[str]] = None
    limit: int = 10
    min_poi_count: int = 5  # 최소 POI 개수 (순차 검색 중단 기준)


# =====================================================================================
# RECOMMEND SERVICE
# =====================================================================================

class RecommendService:
    """POI 추천 검색 서비스"""

    def __init__(self):
        self.client = OpenAI(api_key=CONFIG["openai_api_key"])

    def generate_emotion_embedding(self, emotions: List[str]) -> List[float]:
        """감정/분위기 키워드를 벡터 임베딩으로 변환"""
        if not emotions:
            return None

        emotion_text = " ".join(emotions)
        response = self.client.embeddings.create(
            model="text-embedding-ada-002",
            input=emotion_text
        )
        return response.data[0].embedding

    async def get_geometry_info(self, geometry_id: int, conn) -> Optional[Dict]:
        """geometry_id로 geometry 정보 조회"""
        query = """
            SELECT geometry_id, geom_type, ST_AsGeoJSON(geom) as geojson
            FROM mkb_master_position_geometry
            WHERE geometry_id = $1
        """
        row = await conn.fetchrow(query, geometry_id)
        if row:
            return {
                "geometry_id": row["geometry_id"],
                "geom_type": row["geom_type"],
                "geojson": json.loads(row["geojson"])
            }
        return None

    async def _search_single_category(
        self,
        conn,
        category_id: Optional[str],
        emotion_embedding: Optional[List[float]],
        geometry_info: Optional[Dict],
        request: RecommendRequest
    ) -> List[Dict]:
        """단일 카테고리로 POI 검색 (내부 메서드)"""
        params = []
        param_idx = 1

        # Base SELECT
        select_clause = """
            SELECT
                content_id,
                content_type_id,
                title,
                overview,
                addr1,
                addr2,
                mapx,
                mapy,
                first_image,
                first_image2,
                is_parking_available,
                is_credit_card_ok,
                is_free_admission,
                is_currently_open,
                price_range,
                cuisine_type,
                accommodation_type
        """

        # Vector 검색 제거 - emotion_score 항상 0

        # Core keywords LIKE 매칭 점수 추가 (필수)
        if request.core_keywords and len(request.core_keywords) > 0:
            keyword_match_sql = " + ".join([
                f"CASE WHEN (LOWER(title) LIKE LOWER('%' || ${param_idx + i} || '%') OR LOWER(overview) LIKE LOWER('%' || ${param_idx + i} || '%')) THEN 1 ELSE 0 END"
                for i in range(len(request.core_keywords))
            ])
            select_clause += f",\n    ({keyword_match_sql}) AS keyword_match_count"
            params.extend(request.core_keywords)
            param_idx += len(request.core_keywords)
        else:
            # core_keywords 없으면 검색 결과 없음 (Google 폴백으로)
            select_clause += ",\n    0 AS keyword_match_count"

        # Distance 추가
        if request.user_location:
            select_clause += f",\n    ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${param_idx}, ${param_idx + 1}), 4326)::geography) / 1000 AS distance_km"
            params.extend([request.user_location.lng, request.user_location.lat])
            param_idx += 2
        else:
            select_clause += ",\n    0 AS distance_km"

        # FROM clause
        from_clause = "\nFROM KTO_TOUR_BASE_LIST"

        # WHERE clause 구성
        where_conditions = []

        # Language filter
        where_conditions.append("language = 'Kor'")

        # Category filter (절대적 키워드) - category_id로 직접 검색
        if category_id:
            # category_id 길이로 cat level 결정
            # cat1: 3자리 (A02)
            # cat2: 5자리 (A0201)
            # cat3: 9자리 (A02010100)
            cat_id_len = len(category_id)
            if cat_id_len == 3:
                where_conditions.append(f"cat1 = ${param_idx}")
                params.append(category_id)
                param_idx += 1
            elif cat_id_len == 5:
                where_conditions.append(f"cat2 = ${param_idx}")
                params.append(category_id)
                param_idx += 1
            elif cat_id_len >= 9:
                where_conditions.append(f"cat3 = ${param_idx}")
                params.append(category_id)
                param_idx += 1
            else:
                print(f"[RECOMMEND] Warning: Invalid category_id length: {cat_id_len} ('{category_id}')")

        # Geometry filter (위치 조건)
        if geometry_info:
            geom_type = geometry_info["geom_type"].upper()
            geojson_str = json.dumps(geometry_info["geojson"])

            if geom_type in ['POLYGON', 'MULTIPOLYGON']:
                # POLYGON: Intersects
                where_conditions.append(f"ST_Intersects(location, ST_GeomFromGeoJSON(${param_idx}))")
                params.append(geojson_str)
                param_idx += 1
            else:
                # POINT: 1500m 반경
                where_conditions.append(f"ST_DWithin(location::geography, ST_GeomFromGeoJSON(${param_idx})::geography, 1500)")
                params.append(geojson_str)
                param_idx += 1
        elif request.user_location:
            # geometry_id 없으면 사용자 위치 1500m 반경
            where_conditions.append(f"ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(${param_idx}, ${param_idx + 1}), 4326)::geography, 1500)")
            params.extend([request.user_location.lng, request.user_location.lat])
            param_idx += 2

        # Hard constraint filters (절대적 키워드)
        if request.filters:
            for key, value in request.filters.items():
                if value is not None:
                    where_conditions.append(f"{key} = ${param_idx}")
                    params.append(value)
                    param_idx += 1

        # WHERE clause 조합
        where_clause = "\nWHERE " + " AND ".join(where_conditions) if where_conditions else ""

        # ORDER BY clause - keyword_match_count만 사용 (vector 제거)
        order_clause = "\nORDER BY keyword_match_count DESC, distance_km ASC"

        # LIMIT clause
        limit_clause = f"\nLIMIT ${param_idx}"
        params.append(request.limit)

        # 최종 쿼리
        full_query = select_clause + from_clause + where_clause + order_clause + limit_clause

        print(f"[RECOMMEND] Executing query (category: {category_id}) with {len(params)} params")
        print(f"[RECOMMEND] Params: {params}")

        # 실행
        rows = await conn.fetch(full_query, *params)

        print(f"[RECOMMEND] Query returned {len(rows)} rows (category: {category_id})")

        results = []
        for row in rows:
            results.append({
                "content_id": row["content_id"],
                "content_type_id": row["content_type_id"],
                "title": row["title"],
                "overview": row["overview"],
                "addr1": row["addr1"],
                "addr2": row["addr2"],
                "mapx": float(row["mapx"]) if row["mapx"] else None,
                "mapy": float(row["mapy"]) if row["mapy"] else None,
                "first_image": row["first_image"],
                "first_image2": row["first_image2"],
                "is_parking_available": row["is_parking_available"],
                "is_credit_card_ok": row["is_credit_card_ok"],
                "is_free_admission": row["is_free_admission"],
                "is_currently_open": row["is_currently_open"],
                "price_range": row["price_range"],
                "cuisine_type": row["cuisine_type"],
                "accommodation_type": row["accommodation_type"],
                "distance_km": float(row["distance_km"]) if row["distance_km"] else 0.0,
                "keyword_match_count": int(row["keyword_match_count"]) if row["keyword_match_count"] else 0
            })

        return results

    async def search_pois(self, request: RecommendRequest) -> List[Dict]:
        """LIKE 검색만 수행 (Vector 제거) - keyword matching만 사용"""
        conn = await get_async_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            # Vector 검색 제거 - emotion_embedding 사용 안 함
            emotion_embedding = None

            # 2. Geometry 정보 조회
            geometry_info = None
            if request.geometry_id:
                geometry_info = await self.get_geometry_info(request.geometry_id, conn)

            # 3. 순차 검색 (category_ids 우선순위대로)
            all_pois = []
            used_categories = []

            # category_ids가 없으면 [None]로 (카테고리 없이 검색)
            category_ids = request.category_ids if request.category_ids else [None]

            for category_id in category_ids:
                print(f"[RECOMMEND] 카테고리 {category_id} 검색 중...")

                # 단일 카테고리로 검색
                pois = await self._search_single_category(conn, category_id, emotion_embedding, geometry_info, request)

                if pois:
                    all_pois.extend(pois)
                    used_categories.append(category_id)
                    print(f"[RECOMMEND] {len(pois)}개 POI 발견 (카테고리: {category_id}), 누적: {len(all_pois)}개")

                    # 충분한 결과가 나왔으면 중단
                    if len(all_pois) >= request.min_poi_count:
                        print(f"[RECOMMEND] 충분한 결과 확보 ({len(all_pois)}개), 검색 중단")
                        break
                else:
                    print(f"[RECOMMEND] 카테고리 {category_id}에서 결과 없음")

            print(f"[RECOMMEND] 최종 결과: {len(all_pois)}개 POI (사용 카테고리: {used_categories})")
            return all_pois

        finally:
            await conn.close()
