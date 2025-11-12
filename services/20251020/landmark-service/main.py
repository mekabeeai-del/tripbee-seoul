"""
Landmark Service - 필수 명소 제공 서비스
포트: 8005
"""

import os
import json
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# =====================================================================================
# DATABASE CONNECTION
# =====================================================================================

def get_db_connection():
    """데이터베이스 연결"""
    try:
        # CLAUDE.md에서 설정 읽기
        config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
                import re
                config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
                if config_match:
                    config_str = '{' + config_match.group(1) + '}'
                    config = json.loads(config_str.replace('\t', ''))
                    return psycopg2.connect(
                        host=config["db_host"],
                        port=config["db_port"],
                        database=config["db_name"],
                        user=config["db_user"],
                        password=config["db_password"],
                        cursor_factory=RealDictCursor
                    )

        # Fallback to env
        return psycopg2.connect(
            host=os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
            port=int(os.getenv("DB_PORT", 5432)),
            database=os.getenv("DB_NAME", "postgres"),
            user=os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
            password=os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ"),
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"[ERROR] DB 연결 실패: {e}")
        raise

# =====================================================================================
# MODELS
# =====================================================================================

class LandmarkRequest(BaseModel):
    location_keyword: str
    limit: Optional[int] = 10

# =====================================================================================
# FASTAPI APP
# =====================================================================================

app = FastAPI(title="Landmark Service", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================================
# API ENDPOINTS
# =====================================================================================

@app.post("/api/landmark")
async def get_landmarks(request: LandmarkRequest):
    """
    필수 명소 조회

    Request:
        {
            "location_keyword": "서울",
            "limit": 10
        }

    Response:
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

        conn = get_db_connection()
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Landmark Service"}

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("Landmark Service 시작")
    print("Port: 8005")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8005)
