"""
Beaty Service - TripBee AI 에이전트 서비스
Tool Use 기반 에이전틱 AI

포트: 8000
"""

import json
import logging
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

from schemas.models import BeatyRequest, UserLocation
from agent import BeatyAgent

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# =====================================================================================
# CONFIG 로드
# =====================================================================================

def load_config() -> Dict[str, Any]:
    """CLAUDE.md에서 설정 로드"""
    try:
        config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()
            import re
            config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
            if config_match:
                config_str = '{' + config_match.group(1) + '}'
                return json.loads(config_str.replace('\t', ''))
    except Exception as e:
        logger.error(f"Config 로드 실패: {e}")

    # 기본값
    return {
        "openai_api_key": "",
        "db_host": "localhost",
        "db_port": 5432,
        "db_name": "postgres",
        "db_user": "postgres",
        "db_password": ""
    }


# =====================================================================================
# FASTAPI APP
# =====================================================================================

def create_app() -> FastAPI:
    """FastAPI 앱 생성"""
    app = FastAPI(
        title="Beaty Service - TripBee AI Agent",
        description="Tool Use 기반 에이전틱 AI 서비스",
        version="3.0"
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Config & Agent 초기화
    config = load_config()
    agent = BeatyAgent(openai_api_key=config["openai_api_key"])

    @app.get("/", response_class=HTMLResponse)
    async def root():
        """테스트 UI 페이지"""
        html_path = Path(__file__).parent / "test_ui.html"
        if html_path.exists():
            with open(html_path, "r", encoding="utf-8") as f:
                return f.read()
        return "<h1>test_ui.html not found</h1>"

    @app.get("/health")
    async def health():
        return {"status": "healthy", "service": "Beaty Agent", "version": "3.0"}

    # ==================== MAIN QUERY ENDPOINT ====================

    async def query_event_generator(
        query: str,
        user_location_dict: Optional[Dict],
        mode: str,
        authorization: Optional[str]
    ):
        """SSE 이벤트 생성기"""
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"[API/QUERY] 요청: '{query}'")
            logger.info(f"{'='*60}")

            # 사용자 인증 (선택적)
            user_id = None
            if authorization and authorization.startswith("Bearer "):
                session_token = authorization.replace("Bearer ", "")
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            "http://localhost:8100/api/auth/me",
                            headers={"Authorization": f"Bearer {session_token}"}
                        )
                        if response.status_code == 200:
                            user_data = response.json().get("user", {})
                            user_id = user_data.get("id")
                            logger.info(f"[API/QUERY] 인증된 사용자: user_id={user_id}")
                except Exception as e:
                    logger.warning(f"[API/QUERY] 인증 실패 (무시): {e}")

            # 에이전트 실행
            collected_chunks = []
            collected_data = {}

            async for event in agent.process_query(query, user_location_dict):
                event_type = event.get("type")

                if event_type == "tool_call":
                    # 테스트 모드에서만 도구 호출 정보 전송
                    if mode == "test":
                        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                    logger.info(f"[AGENT] Tool: {event['name']}")

                elif event_type == "tool_result":
                    if mode == "test":
                        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

                elif event_type == "data":
                    # 데이터 이벤트 전송
                    data_event = {"type": "data"}
                    for key in ["pois", "places", "routes", "poi", "landmarks"]:
                        if key in event:
                            data_event[key] = event[key]
                            collected_data[key] = event[key]
                    yield f"data: {json.dumps(data_event, ensure_ascii=False)}\n\n"

                elif event_type == "chunk":
                    # 텍스트 청크 전송
                    collected_chunks.append(event["text"])
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)  # 타이핑 효과

                elif event_type == "done":
                    yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

                elif event_type == "error":
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            logger.info(f"[API/QUERY] 완료: {len(collected_chunks)}개 청크")

        except Exception as e:
            logger.error(f"[API/QUERY] 오류: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    @app.post("/api/query")
    async def process_query(request: BeatyRequest, authorization: Optional[str] = Header(None)):
        """
        통합 쿼리 처리 엔드포인트 (SSE 스트리밍)

        Request:
            {
                "query": "홍대 맛집 추천해줘",
                "user_location": {"lat": 37.497942, "lng": 127.027621},
                "mode": "real"  // "real" 또는 "test"
            }

        Response (SSE):
            data: {"type": "data", "pois": [...]}
            data: {"type": "chunk", "text": "..."}
            data: {"type": "done"}
        """
        user_location_dict = None
        if request.user_location:
            user_location_dict = {
                "lat": request.user_location.lat,
                "lng": request.user_location.lng
            }

        return StreamingResponse(
            query_event_generator(request.query, user_location_dict, request.mode, authorization),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # ==================== UTILITY ENDPOINTS ====================

    @app.get("/api/weather")
    async def get_weather():
        """날씨 조회"""
        from tools.weather_tools import get_weather as weather_tool
        result = await weather_tool()
        if result.get("success"):
            return result
        raise HTTPException(status_code=503, detail="날씨 정보를 가져올 수 없습니다")

    @app.get("/api/weather/detailed")
    async def get_weather_detailed():
        """상세 날씨 조회"""
        from tools.weather_tools import get_weather_detailed as weather_tool
        result = await weather_tool()
        if result.get("success"):
            return result
        raise HTTPException(status_code=503, detail="상세 날씨 정보를 가져올 수 없습니다")

    @app.get("/api/random-poi")
    async def get_random_poi(lat: Optional[float] = None, lng: Optional[float] = None):
        """랜덤 POI 조회"""
        from tools.poi_tools import get_random_poi as random_tool
        result = await random_tool(user_lat=lat, user_lng=lng)
        return result

    return app


# =====================================================================================
# MAIN
# =====================================================================================

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
