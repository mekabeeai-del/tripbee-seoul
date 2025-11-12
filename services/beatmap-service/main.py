"""
Beatmap Service - 사용자 위치 기반 Beatmap 데이터 서비스
포트: 8200

사용자 위치 중심의 beatmap 데이터를 제공
(KTO POI 메타데이터 및 상세정보는 POI-Service 8001로 이전)
"""

import os
import json
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
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
# FASTAPI APP
# =====================================================================================

app = FastAPI(title="Beatmap Service", version="1.0")

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

@app.get("/")
async def root():
    """서비스 정보"""
    return {
        "service": "Beatmap Service",
        "version": "1.0",
        "port": 8200,
        "description": "사용자 위치 기반 beatmap 데이터 서비스",
        "note": "KTO POI 메타데이터 및 상세정보는 POI-Service (http://localhost:8001/api/kto/*) 로 이전되었습니다."
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Beatmap Service"}

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("Beatmap Service 시작")
    print("Port: 8200")
    print("="*60)
    print("INFO: KTO POI 관련 엔드포인트는 POI-Service (8001)로 이전되었습니다.")
    print("  - GET /api/kto/list - KTO POI 메타데이터 목록")
    print("  - GET /api/kto/detail/{content_id} - KTO POI 상세정보")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8200)
