"""
Recommend Service - POI 검색 엔진
CategoryVector + MasterPosition 결과를 받아 실제 POI 검색 수행
포트: 8001
"""

import json
import asyncio
import asyncpg
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# =====================================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================================

class CategoryInfo(BaseModel):
    cat_code: str
    cat_level: int
    content_type_id: str

class UserLocation(BaseModel):
    lat: float
    lng: float

class RecommendRequest(BaseModel):
    query_text: str
    category: Optional[CategoryInfo] = None
    geometry_id: Optional[int] = None
    user_location: Optional[UserLocation] = None
    filters: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, List[str]]] = None
    core_keywords: Optional[List[str]] = None
    limit: int = 10

# =====================================================================================
# RECOMMEND SERVICE
# =====================================================================================

class RecommendService:
    """POI 추천 검색 서비스"""

    def __init__(self):
        # Load config from CLAUDE.md
        try:
            config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
                import re
                config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
                if config_match:
                    config_str = '{' + config_match.group(1) + '}'
                    config = json.loads(config_str.replace('\t', ''))
                    self.openai_api_key = config["openai_api_key"]
                    self.db_config = {
                        "host": config["db_host"],
                        "port": config["db_port"],
                        "database": config["db_name"],
                        "user": config["db_user"],
                        "password": config["db_password"]
                    }
                else:
                    raise ValueError("Could not parse config from CLAUDE.md")
        except Exception as e:
            print(f"Error loading config: {e}")
            self.openai_api_key = os.getenv("OPENAI_API_KEY")
            self.db_config = {
                "host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
                "port": int(os.getenv("DB_PORT", 5432)),
                "database": os.getenv("DB_NAME", "postgres"),
                "user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
                "password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ")
            }

        self.client = OpenAI(api_key=self.openai_api_key)

    async def get_db_connection(self):
        """데이터베이스 연결"""
        try:
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            conn = await asyncpg.connect(
                host=self.db_config["host"],
                port=self.db_config["port"],
                database=self.db_config["database"],
                user=self.db_config["user"],
                password=self.db_config["password"],
                ssl=ssl_context,
                command_timeout=60
            )
            return conn
        except Exception as e:
            print(f"[DB] Connection error: {e}")
            return None

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

    async def search_pois(self, request: RecommendRequest) -> List[Dict]:
        """하이브리드 POI 검색 (Vector + Geometry + Filters)"""
        conn = await self.get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        try:
            # 1. Emotion Vector 생성 (상대적 키워드)
            emotion_embedding = None
            if request.preferences and request.preferences.get("emotions"):
                emotion_embedding = self.generate_emotion_embedding(request.preferences["emotions"])

            # 2. Geometry 정보 조회
            geometry_info = None
            if request.geometry_id:
                geometry_info = await self.get_geometry_info(request.geometry_id, conn)

            # 3. 쿼리 구성
            query_parts = []
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

            # Emotion score 추가
            if emotion_embedding:
                embedding_str = '[' + ','.join(map(str, emotion_embedding)) + ']'
                select_clause += f",\n    (1 - (combined_embedding <=> ${param_idx}::vector)) AS emotion_score"
                params.append(embedding_str)
                param_idx += 1
            else:
                select_clause += ",\n    0 AS emotion_score"

            # Core keywords LIKE 매칭 점수 추가
            if request.core_keywords and len(request.core_keywords) > 0:
                keyword_match_sql = " + ".join([
                    f"CASE WHEN (LOWER(title) LIKE LOWER('%' || ${param_idx + i} || '%') OR LOWER(overview) LIKE LOWER('%' || ${param_idx + i} || '%')) THEN 1 ELSE 0 END"
                    for i in range(len(request.core_keywords))
                ])
                select_clause += f",\n    ({keyword_match_sql}) AS keyword_match_count"
                params.extend(request.core_keywords)
                param_idx += len(request.core_keywords)
            else:
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

            # Category filter (절대적 키워드)
            if request.category:
                where_conditions.append(f"content_type_id = ${param_idx}")
                params.append(request.category.content_type_id)
                param_idx += 1

                where_conditions.append(f"cat{request.category.cat_level} = ${param_idx}")
                params.append(request.category.cat_code)
                param_idx += 1

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
                    # POINT: 500m 반경
                    where_conditions.append(f"ST_DWithin(location::geography, ST_GeomFromGeoJSON(${param_idx})::geography, 500)")
                    params.append(geojson_str)
                    param_idx += 1
            elif request.user_location:
                # geometry_id 없으면 사용자 위치 500m 반경
                where_conditions.append(f"ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(${param_idx}, ${param_idx + 1}), 4326)::geography, 500)")
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

            # ORDER BY clause - keyword_match_count 최우선!
            order_clause = "\nORDER BY keyword_match_count DESC, emotion_score DESC, distance_km ASC"

            # LIMIT clause
            limit_clause = f"\nLIMIT ${param_idx}"
            params.append(request.limit)

            # 최종 쿼리
            full_query = select_clause + from_clause + where_clause + order_clause + limit_clause

            print(f"[RECOMMEND] Executing query with {len(params)} params")
            print(f"[RECOMMEND] Params: {params}")
            print(f"[RECOMMEND] Full Query:\n{full_query}")

            # 실행
            rows = await conn.fetch(full_query, *params)

            print(f"[RECOMMEND] Query returned {len(rows)} rows")

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
                    "emotion_score": float(row["emotion_score"]) if row["emotion_score"] else 0.0,
                    "distance_km": float(row["distance_km"]) if row["distance_km"] else 0.0,
                    "keyword_match_count": int(row["keyword_match_count"]) if row["keyword_match_count"] else 0
                })

            print(f"[RECOMMEND] Found {len(results)} POIs")
            return results

        finally:
            await conn.close()

# =====================================================================================
# FASTAPI APP
# =====================================================================================

def create_app() -> FastAPI:
    """FastAPI 앱 생성"""
    app = FastAPI(title="Recommend Service - POI 검색 엔진", version="1.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    service = RecommendService()

    @app.get("/")
    async def root():
        return {
            "service": "Recommend Service",
            "version": "1.0",
            "description": "POI 검색 엔진 - CategoryVector + MasterPosition 기반 하이브리드 검색",
            "port": 8001
        }

    @app.post("/api/recommend")
    async def recommend(request: RecommendRequest):
        """POI 추천 검색"""
        try:
            results = await service.search_pois(request)
            return {
                "success": True,
                "query": request.query_text,
                "count": len(results),
                "results": results
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8001)
