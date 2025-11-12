"""
Random POI Service - 랜덤 장소 추천 서비스
포트: 8006
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
from openai import OpenAI
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

def get_openai_key():
    """OpenAI API Key 가져오기"""
    try:
        config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
                import re
                config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
                if config_match:
                    config_str = '{' + config_match.group(1) + '}'
                    config = json.loads(config_str.replace('\t', ''))
                    return config.get("openai_api_key")
        return os.getenv("OPENAI_API_KEY")
    except Exception as e:
        print(f"[ERROR] OpenAI Key 가져오기 실패: {e}")
        return os.getenv("OPENAI_API_KEY")

# =====================================================================================
# FASTAPI APP
# =====================================================================================

app = FastAPI(title="Random POI Service", version="1.0")

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

@app.get("/api/random-poi")
async def get_random_poi(
    lat: Optional[float] = None,
    lng: Optional[float] = None
):
    """
    랜덤 POI 조회 및 Beaty 소개

    Query Parameters:
        lat: 사용자 위치 위도 (optional)
        lng: 사용자 위치 경도 (optional)
        - lat/lng가 제공되면 반경 1.5km 이내의 POI만 조회

    Response:
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

        conn = get_db_connection()
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
            raise HTTPException(status_code=404, detail="POI를 찾을 수 없습니다")

        print(f"[RANDOM_POI] 선택된 POI: {result['title']}")

        # GPT-4o-mini로 Beaty 소개 생성
        openai_key = get_openai_key()
        if openai_key:
            try:
                client = OpenAI(api_key=openai_key)

                beaty_prompt = f"""당신은 서울 여행 가이드 '비티(Beaty)'입니다.
귀엽고 친근한 말투로 장소를 소개해주세요.

장소명: {result['title']}
주소: {result['addr1']}
설명: {result['overview'][:200]}

위 정보를 바탕으로 **2줄 이내**로 간단히 소개해주세요.
장소명은 그대로 유지하고, 친근하고 매력적으로 설명해주세요.
"~예요", "~해요" 같은 존댓말 반말 섞인 톤으로 해주세요."""

                response = client.chat.completions.create(
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
                beaty_description = f"{result['title']}은(는) 서울의 멋진 장소예요! 한번 가보실래요? 🐝"
        else:
            beaty_description = f"{result['title']}은(는) 서울의 멋진 장소예요! 한번 가보실래요? 🐝"

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Random POI Service"}

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("Random POI Service 시작")
    print("Port: 8006")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8006)
