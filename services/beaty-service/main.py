"""
Beaty Service - TripBee AI 캐릭터 서비스
외부 서비스 의존성 없이 자체적으로 모든 기능 수행
포트: 8000
"""

import json
import httpx
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Body, Header
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import asyncio
import uuid
from datetime import datetime
import asyncpg

# 로컬 모듈 임포트
from orchestration.intent_classifier import IntentClassifier
from orchestration.geocoder import GoogleGeocoder
from orchestration.session_memory import memory_manager
from orchestration.gpt_streaming import stream_gpt_response
from utils.weather_client import WeatherClient

load_dotenv()

# =====================================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================================

class UserLocation(BaseModel):
    lat: float
    lng: float

class BeatyRequest(BaseModel):
    query: str
    user_location: Optional[UserLocation] = None
    mode: Optional[str] = "real"  # "real" or "test"

class BeatyResponse(BaseModel):
    success: bool
    query: str
    intent: str
    natural_response: str
    geojson: Optional[Dict] = None
    pois: Optional[List[Dict]] = None
    debug_info: Optional[Dict] = None

# =====================================================================================
# BEATY SERVICE
# =====================================================================================

class BeatyService:
    """Beaty AI 캐릭터 서비스"""

    def __init__(self):
        # Load config
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
                    self.google_api_key = config["google_api_key"]
                    self.weather_api_key = config.get("openweathermap_api_key", "")  # OpenWeatherMap API 키
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
            self.google_api_key = os.getenv("GOOGLE_API_KEY", "AIzaSyBIQVYNLnbSdjIN2agdGeo0K10cbseBXoM")
            self.weather_api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")
            self.db_config = {
                "host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
                "port": int(os.getenv("DB_PORT", 5432)),
                "database": os.getenv("DB_NAME", "postgres"),
                "user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
                "password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ")
            }

        self.client = OpenAI(api_key=self.openai_api_key)

        # Load character prompt for final response generation
        character_prompt_path = Path(__file__).parent / "orchestration" / "beaty_character_prompt.txt"
        try:
            with open(character_prompt_path, "r", encoding="utf-8") as f:
                self.character_prompt = f.read()
            print(f"[BEATY_SERVICE] Character prompt loaded from {character_prompt_path}")
        except Exception as e:
            print(f"[BEATY_SERVICE] Warning: Could not load character prompt: {e}")
            self.character_prompt = "당신은 Beaty라는 친절한 여행 도우미입니다. 항상 존댓말을 사용하고 밝은 어조로 대화합니다."

        # Store config for pipelines
        self.config = {
            "openai_api_key": self.openai_api_key,
            "google_api_key": self.google_api_key,
            "db_config": self.db_config
        }

        # Initialize internal modules
        self.intent_classifier = IntentClassifier(self.openai_api_key, self.db_config)
        self.google_geocoder = GoogleGeocoder(self.google_api_key)  # ROUTE용 Google Geocoding API
        self.weather_client = WeatherClient(self.weather_api_key)  # 기상청 날씨 API



# =====================================================================================
# FASTAPI APP
# =====================================================================================

def create_app() -> FastAPI:
    """FastAPI 앱 생성"""
    app = FastAPI(title="Beaty Service - TripBee AI Character", version="2.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    service = BeatyService()

    @app.on_event("startup")
    async def startup_event():
        """서비스 시작 시 비동기 초기화"""
        print("[BEATY_SERVICE] 초기화 시작...")
        await service.intent_classifier.initialize()
        print("[BEATY_SERVICE] 초기화 완료!")

    @app.get("/", response_class=HTMLResponse)
    async def root():
        """테스트 UI 페이지 제공"""
        html_path = Path(__file__).parent / "test_ui.html"
        if html_path.exists():
            with open(html_path, "r", encoding="utf-8") as f:
                return f.read()
        else:
            return """
            <html>
                <body>
                    <h1>Beaty Service</h1>
                    <p>test_ui.html 파일이 없습니다.</p>
                </body>
            </html>
            """

    # ==================== UNIFIED PIPELINE ENDPOINT ====================

    async def query_event_generator(
        query: str,
        user_location_dict: Optional[Dict],
        mode: str,
        authorization: Optional[str]
    ):
        """SSE 이벤트 생성기"""
        try:
            if not query:
                error_event = {"type": "error", "message": "query is required"}
                yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                return

            # Authorization 헤더에서 user_id와 session_id 추출
            user_id = None
            session_id = None
            session_token = None
            print(f"[API/QUERY] Authorization 헤더: {authorization}")
            if authorization and authorization.startswith("Bearer "):
                session_token = authorization.replace("Bearer ", "")
                print(f"[API/QUERY] Session token: {session_token[:20]}...")
                try:
                    # privacy-service에 session_token으로 user 정보 조회
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            "http://localhost:8100/api/auth/me",
                            headers={"Authorization": f"Bearer {session_token}"}
                        )
                        print(f"[API/QUERY] Privacy service 응답 코드: {response.status_code}")
                        if response.status_code == 200:
                            response_data = response.json()
                            print(f"[API/QUERY] Privacy service 응답 데이터: {response_data}")
                            user_data = response_data.get("user", {})
                            user_id = user_data.get("id")
                            session_id_str = response_data.get("session_id")
                            session_id = int(session_id_str) if session_id_str else None  # 문자열 → 정수 변환
                            print(f"[API/QUERY] 인증된 사용자: user_id={user_id}, session_id={session_id} (type={type(session_id)})")
                        else:
                            print(f"[API/QUERY] Privacy service 응답: {response.text}")
                except Exception as e:
                    print(f"[API/QUERY] 사용자 인증 실패 (무시): {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"[API/QUERY] Authorization 헤더 없음 또는 형식 오류")

            print(f"\n{'='*60}")
            print(f"[API/QUERY] 요청: '{query}' (user_id={user_id})")
            print(f"{'='*60}")

            steps = []

            # 세션 메모리 가져오기 (session_token 기반)
            memory_session_id = session_token[:32] if session_token else "default"
            session_memory = memory_manager.get_session(memory_session_id)

            # 대화 맥락 가져오기 (최근 5개)
            context_messages = session_memory.get_context(last_n=5)

            # Step 1: 의도분류 (대화 맥락 포함)
            classification = service.intent_classifier.classify(query, context_messages)
            intent = classification.get("intent", "RECOMMEND")

            steps.append({
                "step": 1,
                "name": "의도분류",
                "result": classification
            })
            print(f"[API/QUERY] Step 1 완료: intent={intent}")

            # Step 2~N: 의도별 파이프라인 실행
            if intent == "ROUTE":
                from pipelines.route.pipeline import execute
                pipeline_result = await execute(service, query, classification, user_location_dict, steps)

            elif intent == "FIND_PLACE":
                from pipelines.google.pipeline import execute
                pipeline_result = await execute(service, query, classification, user_location_dict, steps)

            elif intent == "RECOMMEND":
                from pipelines.recommend.pipeline import execute
                pipeline_result = await execute(service, query, classification, user_location_dict, steps)

            elif intent == "LANDMARK":
                from pipelines.landmark.pipeline import execute
                pipeline_result = await execute(service, query, classification, user_location_dict, steps)

            elif intent == "RANDOM":
                from pipelines.randompoi.pipeline import execute
                pipeline_result = await execute(service, query, classification, user_location_dict, steps)

            else:
                # GENERAL_CHAT 등 기타 의도 - GPT-4 mini가 직접 대화 (대화 맥락 포함, 스트리밍)
                try:
                    # 대화 맥락을 포함한 메시지 구성
                    messages = [{"role": "system", "content": service.character_prompt}]
                    messages.extend(context_messages)  # 기존 대화 추가
                    messages.append({"role": "user", "content": query})

                    # 스트리밍 응답 생성
                    from orchestration.response_generator import create_streaming_response_with_messages
                    answer_stream = create_streaming_response_with_messages(service, messages)

                    pipeline_result = {
                        "intent": intent,
                        "steps": steps,
                        "final_response": {
                            "answer": "",  # 스트리밍에서 채워짐
                            "answer_stream": answer_stream,
                            "intent": intent
                        }
                    }
                except Exception as e:
                    print(f"[GENERAL_CHAT] OpenAI 호출 실패: {e}")
                    answer = "앗, 잠깐 문제가 생겼어요. 다시 한 번 말씀해주시겠어요?"

                    pipeline_result = {
                        "intent": intent,
                        "steps": steps,
                        "final_response": {
                            "answer": answer,
                            "intent": intent
                        }
                    }

            print(f"[API/QUERY] 파이프라인 완료: {len(pipeline_result['steps'])}개 단계")
            print(f"{'='*60}\n")

            # Event 1: 데이터 먼저 전송 (pois, places, routes 등)
            data_event = {
                "type": "data",
                "intent": pipeline_result["intent"]
            }

            final_response = pipeline_result["final_response"]

            # 의도별로 데이터 필드 추가
            if "pois" in final_response:
                data_event["pois"] = final_response["pois"]
            if "places" in final_response:
                data_event["places"] = final_response["places"]
            if "routes" in final_response:
                data_event["routes"] = final_response["routes"]
            if "poi" in final_response:  # RANDOM 파이프라인
                data_event["poi"] = final_response["poi"]
            if "count" in final_response:
                data_event["count"] = final_response["count"]
            if "search_keyword" in final_response:
                data_event["search_keyword"] = final_response["search_keyword"]

            # 테스트 모드인 경우 steps도 포함
            if mode == "test":
                data_event["steps"] = pipeline_result["steps"]

            yield f"data: {json.dumps(data_event, ensure_ascii=False)}\n\n"
            print(f"[SSE] data 이벤트 전송 완료")

            # Event 2~N: answer_stream이 있으면 스트리밍
            if "answer_stream" in final_response:
                print(f"[SSE] 스트리밍 시작")
                full_answer = ""
                async for chunk in final_response["answer_stream"]:
                    full_answer += chunk
                    chunk_event = {
                        "type": "chunk",
                        "text": chunk
                    }
                    yield f"data: {json.dumps(chunk_event, ensure_ascii=False)}\n\n"
                    # 타이핑 효과를 위한 딜레이 (30ms)
                    await asyncio.sleep(0.03)
                print(f"[SSE] 스트리밍 완료: {len(full_answer)} chars")

                # 세션 메모리에 대화 저장 (스트리밍 완료 후)
                session_memory.add_message("user", query)
                session_memory.add_message("assistant", full_answer)
                print(f"[MEMORY] 대화 저장 완료 (session: {memory_session_id})")

                # 로그에 사용할 answer 업데이트
                final_response["answer"] = full_answer
            else:
                # answer_stream이 없으면 기존 answer 사용
                answer = final_response.get("answer", "")
                session_memory.add_message("user", query)
                session_memory.add_message("assistant", answer)
                print(f"[MEMORY] 대화 저장 완료 (session: {memory_session_id})")

            # Final Event: done
            done_event = {"type": "done"}
            yield f"data: {json.dumps(done_event, ensure_ascii=False)}\n\n"
            print(f"[SSE] done 이벤트 전송 완료")

            # 백그라운드 로그 저장 (answer_stream 제외)
            response_time_ms = len(pipeline_result['steps']) * 100

            # answer_stream을 제외한 final_response 복사
            final_response_for_log = {k: v for k, v in final_response.items() if k != 'answer_stream'}

            asyncio.create_task(
                save_query_log(
                    query_text=query,
                    intent=pipeline_result["intent"],
                    intent_result=classification,
                    pipeline_steps=pipeline_result["steps"],
                    final_response=final_response_for_log,
                    response_time_ms=response_time_ms,
                    db_config=service.db_config,
                    user_id=user_id,
                    session_id=session_id
                )
            )

        except Exception as e:
            print(f"[API/QUERY] 오류: {e}")
            import traceback
            traceback.print_exc()
            error_event = {
                "type": "error",
                "message": str(e)
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    @app.post("/api/query")
    async def process_query(request: BeatyRequest, authorization: Optional[str] = Header(None)):
        """
        통합 쿼리 처리 엔드포인트 (SSE 스트리밍)

        Request:
            {
                "query": "강남역 근처 맛집 추천해줘",
                "user_location": {
                    "lat": 37.497942,
                    "lng": 127.027621
                },
                "mode": "real"  // "real" (최종 응답만) 또는 "test" (전체 steps 포함)
            }

        Headers:
            Authorization: Bearer {session_token} (optional)

        Response (SSE):
            event: data
            data: {"type": "data", "intent": "FIND_PLACE", "places": [...]}

            event: data
            data: {"type": "chunk", "text": "안녕하세요..."}

            event: data
            data: {"type": "done"}
        """
        query_text = request.query
        user_location_dict = None
        if request.user_location:
            user_location_dict = {"lat": request.user_location.lat, "lng": request.user_location.lng}

        return StreamingResponse(
            query_event_generator(query_text, user_location_dict, request.mode, authorization),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Nginx 버퍼링 비활성화
            }
        )

    @app.get("/api/random-poi")
    async def get_random_poi(
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        authorization: Optional[str] = None
    ):
        """
        랜덤 POI 조회 (RANDOM 파이프라인 사용)

        Query Parameters:
            lat: 사용자 위치 위도 (optional)
            lng: 사용자 위치 경도 (optional)

        Headers:
            Authorization: Bearer {session_token} (optional)

        Response:
            {
                "success": true,
                "poi": {
                    "content_id": "...",
                    "title": "...",
                    "addr1": "...",
                    "mapx": 126.9770,
                    "mapy": 37.5796,
                    "first_image": "...",
                    "overview": "...",
                    "beaty_description": "..."
                }
            }
        """
        try:
            session_token = None
            if authorization and authorization.startswith("Bearer "):
                session_token = authorization.replace("Bearer ", "")

            print(f"[BEATY/RANDOM_POI] 랜덤 POI 요청 (lat={lat}, lng={lng}, has_token={session_token is not None})")

            # RANDOM 파이프라인 호출
            steps = []
            classification = {"intent": "RANDOM", "confidence": 1.0}

            user_location_dict = None
            if lat is not None and lng is not None:
                user_location_dict = {"lat": lat, "lng": lng}

            from pipelines.randompoi.pipeline import execute
            pipeline_result = await execute(service, "랜덤 추천", classification, user_location_dict, steps, session_token)

            if pipeline_result["final_response"].get("poi"):
                poi = pipeline_result["final_response"]["poi"]
                print(f"[BEATY/RANDOM_POI] 완료: {poi.get('title', 'Unknown')}")
                return {
                    "success": True,
                    "poi": poi
                }
            else:
                return {
                    "success": False,
                    "poi": None
                }

        except Exception as e:
            print(f"[BEATY/RANDOM_POI] 오류: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/history/queries")
    async def get_query_history(limit: int = 20, offset: int = 0, user_id: Optional[int] = None):
        """
        사용자의 대화기록 조회 (query_logs 테이블에서)

        Query Parameters:
            limit: 최대 개수 (기본 20개)
            offset: 건너뛸 개수 (기본 0개) - pagination용
            user_id: 사용자 ID (향후 JWT에서 추출)

        Response:
            {
                "success": true,
                "queries": [
                    {
                        "id": 1,
                        "query_text": "홍대까지 어떻게가?",
                        "intent": "ROUTE",
                        "result_count": 5,
                        "beaty_response_text": "...",
                        "final_result": {...},
                        "created_at": "2025-01-15T10:30:00"
                    },
                    ...
                ]
            }
        """
        try:
            print(f"[BEATY/HISTORY] 대화기록 조회: user_id={user_id}, limit={limit}, offset={offset}")

            # DB 연결 (SSL 필요)
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            conn = await asyncpg.connect(
                host=service.db_config["host"],
                port=service.db_config["port"],
                database=service.db_config["database"],
                user=service.db_config["user"],
                password=service.db_config["password"],
                ssl=ssl_context
            )

            # Query 실행
            if user_id:
                query_sql = """
                    SELECT id, query_text, intent, result_count,
                           beaty_response_text, beaty_response_type,
                           final_result, created_at
                    FROM query_logs
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2 OFFSET $3
                """
                rows = await conn.fetch(query_sql, user_id, limit, offset)
            else:
                # user_id가 없으면 전체 조회 (테스트용)
                query_sql = """
                    SELECT id, query_text, intent, result_count,
                           beaty_response_text, beaty_response_type,
                           final_result, created_at
                    FROM query_logs
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                """
                rows = await conn.fetch(query_sql, limit, offset)

            await conn.close()

            # 결과 포맷팅
            queries = []
            for row in rows:
                queries.append({
                    "id": row["id"],
                    "query_text": row["query_text"],
                    "intent": row["intent"],
                    "result_count": row["result_count"],
                    "beaty_response_text": row["beaty_response_text"],
                    "beaty_response_type": row["beaty_response_type"],
                    "final_result": row["final_result"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                })

            print(f"[BEATY/HISTORY] 완료: {len(queries)}개 조회")

            return {
                "success": True,
                "queries": queries
            }

        except Exception as e:
            print(f"[BEATY/HISTORY] 오류: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/weather")
    async def get_weather():
        """
        서울 날씨 정보 조회
        Returns:
            {
                "temperature": 18,
                "sky": "맑음",
                "precipitation": "없음",
                "humidity": 60,
                "wind_speed": 2.5,
                "emoji": "☀️"
            }
        """
        try:
            weather = service.weather_client.get_current_weather()
            if weather:
                return weather
            else:
                raise HTTPException(status_code=503, detail="날씨 정보를 가져올 수 없습니다")
        except Exception as e:
            print(f"[WEATHER] 오류: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/weather/detailed")
    async def get_detailed_weather():
        """
        서울 상세 날씨 정보 조회 (현재 날씨 + 시간별 예보 + 일출/일몰)
        Returns:
            {
                "current": {
                    "temperature": 18,
                    "feels_like": 16,
                    "sky": "맑음",
                    "precipitation": "없음",
                    "humidity": 60,
                    "wind_speed": 2.5,
                    "emoji": "☀️",
                    "description": "맑음"
                },
                "hourly": [
                    {"time": "15:00", "hour": "15시", "temperature": 18, "emoji": "☀️"},
                    ...
                ],
                "sunrise": "06:30",
                "sunset": "18:45"
            }
        """
        try:
            weather_detail = service.weather_client.get_detailed_weather()
            if weather_detail:
                return weather_detail
            else:
                raise HTTPException(status_code=503, detail="상세 날씨 정보를 가져올 수 없습니다")
        except Exception as e:
            print(f"[WEATHER_DETAILED] 오류: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/health")
    async def health():
        return {"status": "healthy", "character": "Beaty"}

    return app

# =====================================================================================
# QUERY LOG FUNCTION
# =====================================================================================

async def save_query_log(
    query_text: str,
    intent: str,
    intent_result: Dict[str, Any],
    pipeline_steps: List[Dict[str, Any]],
    final_response: Dict[str, Any],
    response_time_ms: int,
    db_config: Dict[str, str],
    user_id: Optional[int] = None,
    session_id: Optional[str] = None
):
    """
    Query 로그를 DB에 비동기로 저장
    - 백그라운드에서 실행되어 응답 속도에 영향 없음
    - 실패해도 메인 파이프라인에 영향 없음
    """
    try:
        # DB 연결 (SSL 필요)
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        conn = await asyncpg.connect(
            host=db_config["host"],
            port=db_config["port"],
            database=db_config["database"],
            user=db_config["user"],
            password=db_config["password"],
            ssl=ssl_context
        )

        # 파이프라인 이름 추출
        pipeline_name = intent.lower()  # "FIND_PLACE" -> "findplace"

        # 결과 개수 추출
        result_count = 0
        if "pois" in final_response:
            result_count = len(final_response["pois"])
        elif "routes" in final_response:
            result_count = len(final_response["routes"])
        elif "places" in final_response:
            result_count = len(final_response["places"])
        elif "poi" in final_response:
            result_count = 1

        # Beaty 응답 텍스트 및 타입 추출
        beaty_response_text = final_response.get("answer", "")
        beaty_response_type = "text"
        if "pois" in final_response or "poi" in final_response:
            beaty_response_type = "pois"
        elif "routes" in final_response:
            beaty_response_type = "route"
        elif "places" in final_response:
            beaty_response_type = "pois"

        # Intent 결과에서 추가 필드 추출
        location_keyword = intent_result.get("location", "")
        category_text = intent_result.get("category", "")
        emotion_keywords = intent_result.get("emotions", [])

        # pipeline_steps 메타데이터만 추출 (place_ids만)
        pipeline_metadata = []
        for step in pipeline_steps:
            step_meta = {
                "step": step.get("step"),
                "name": step.get("name"),
                "status": "success"
            }

            # POI 데이터가 있으면 place_ids만 추출
            if "result" in step:
                result = step["result"]
                if "pois" in result:
                    step_meta["place_ids"] = [poi.get("content_id") for poi in result["pois"] if poi.get("content_id")]
                elif "places" in result:
                    step_meta["place_ids"] = [p.get("place_id") for p in result["places"] if p.get("place_id")]

            pipeline_metadata.append(step_meta)

        # INSERT
        await conn.execute("""
            INSERT INTO query_logs (
                user_id, session_id, query_text,
                intent, location_keyword, category_text, emotion_keywords,
                pipeline, result_count, response_time_ms,
                beaty_response_text, beaty_response_type,
                intent_result, pipeline_steps, final_result
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, $7,
                $8, $9, $10,
                $11, $12,
                $13, $14, $15
            )
        """,
            user_id,
            session_id,  # user_sessions.id (integer)
            query_text,
            intent,
            location_keyword,
            category_text,
            emotion_keywords,
            pipeline_name,
            result_count,
            response_time_ms,
            beaty_response_text,
            beaty_response_type,
            json.dumps(intent_result),  # JSONB
            json.dumps(pipeline_metadata),  # JSONB
            json.dumps(final_response)  # JSONB
        )

        await conn.close()
        print(f"[QUERY_LOG] 저장 완료: query='{query_text[:30]}...', intent={intent}, result_count={result_count}")

    except Exception as e:
        # 로그 저장 실패해도 메인 파이프라인에 영향 없음
        print(f"[QUERY_LOG] 저장 실패 (무시): {e}")
        import traceback
        traceback.print_exc()

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
