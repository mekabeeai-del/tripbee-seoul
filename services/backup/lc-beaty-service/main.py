"""
LC-Beaty Service - LangChain 기반 대화형 여행 도우미
포트: 8000 (기존 beaty-service와 동일)
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from agent.langchain_agent import BeatyAgent

load_dotenv()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class UserLocation(BaseModel):
    lat: float
    lng: float


class BeatyRequest(BaseModel):
    query: str
    user_location: Optional[UserLocation] = None


class BeatyResponse(BaseModel):
    success: bool
    query: str
    intent: str  # Agent가 사용한 도구 이름
    natural_response: str  # AI 응답 텍스트
    geojson: Optional[Dict] = None  # 향후 확장용
    pois: Optional[List[Dict]] = None  # 향후 확장용
    data: Optional[Dict] = None  # 도구에서 추출한 원본 데이터
    chat_history: Optional[list] = None  # 대화 히스토리 (선택)
    debug_info: Optional[Dict] = None


# ============================================================================
# CONFIG LOADING
# ============================================================================

def load_config():
    """CLAUDE.md에서 설정 로드"""
    try:
        config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()
            import re
            config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
            if config_match:
                config_str = '{' + config_match.group(1) + '}'
                config = json.loads(config_str.replace('\t', ''))
                return {
                    "openai_api_key": config["openai_api_key"]
                }
    except Exception as e:
        print(f"[CONFIG] CLAUDE.md 로드 실패: {e}")

    # Fallback: 환경변수
    return {
        "openai_api_key": os.getenv("OPENAI_API_KEY")
    }


# ============================================================================
# FASTAPI APP
# ============================================================================

def create_app() -> FastAPI:
    """FastAPI 앱 생성"""
    app = FastAPI(
        title="LC-Beaty Service - LangChain AI Character",
        version="1.0",
        description="LangChain 기반 대화형 여행 도우미"
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Config 로드
    config = load_config()

    # Beaty Agent 초기화
    agent = BeatyAgent(openai_api_key=config["openai_api_key"])

    @app.on_event("startup")
    async def startup_event():
        """서비스 시작 시"""
        print("\n" + "="*60)
        print("LC-BEATY SERVICE 시작")
        print("="*60)
        print(f"사용 가능한 도구: {agent.get_available_tools()}")
        print("="*60 + "\n")

    @app.get("/")
    async def root():
        """헬스체크"""
        return {
            "service": "lc-beaty-service",
            "status": "running",
            "version": "1.0",
            "tools": agent.get_available_tools()
        }

    @app.post("/api/query", response_model=BeatyResponse)
    async def process_query(
        request: BeatyRequest,
        authorization: Optional[str] = Header(None)
    ):
        """
        통합 쿼리 처리 엔드포인트 (기존 beaty-service와 동일)

        Request:
            {
                "query": "홍대 맛집 추천해줘",
                "user_location": {"lat": 37.5665, "lng": 126.9780}
            }

        Response:
            {
                "success": true,
                "query": "홍대 맛집 추천해줘",
                "response": "AI 응답 텍스트",
                "chat_history": [...],
                "debug_info": {...}
            }
        """
        try:
            query = request.query
            if not query:
                raise HTTPException(status_code=400, detail="query is required")

            # 사용자 위치
            user_location_dict = None
            if request.user_location:
                user_location_dict = {
                    "lat": request.user_location.lat,
                    "lng": request.user_location.lng
                }

            # 세션 ID 추출 (Authorization 헤더에서)
            session_id = None
            if authorization and authorization.startswith("Bearer "):
                session_token = authorization.replace("Bearer ", "")
                # 간단하게 토큰 자체를 세션 ID로 사용 (해시 가능)
                session_id = session_token[:32]  # 앞 32자만 사용
                print(f"[API/QUERY] 세션 ID: {session_id}")

            # Agent 실행
            result = agent.run(
                query=query,
                session_id=session_id,
                user_location=user_location_dict
            )

            # Agent가 사용한 도구 추출 (intent 대체)
            tools_used = []
            tool_outputs = []
            intermediate_steps = result.get("intermediate_steps", [])
            if intermediate_steps:
                try:
                    for step in intermediate_steps:
                        tools_used.append(step[0].tool)
                        tool_outputs.append(step[1])  # 도구 출력 저장
                except:
                    tools_used = []
                    tool_outputs = []

            # 첫 번째 도구를 intent로 사용 (없으면 "GENERAL_CHAT")
            # 도구 이름을 프론트엔드가 기대하는 대문자 형식으로 변환
            tool_to_intent_map = {
                "find_place": "FIND_PLACE",
                "recommend_poi": "RECOMMEND",
                "search_route": "ROUTE",
                "get_landmark": "LANDMARK",
                "random_poi": "RANDOM_POI"
            }
            raw_intent = tools_used[0] if tools_used else None
            intent = tool_to_intent_map.get(raw_intent, "GENERAL_CHAT")

            # 도구 출력에서 data 필드 추출
            extracted_data = None
            if tool_outputs:
                for output in tool_outputs:
                    try:
                        # JSON 파싱 시도
                        import json
                        parsed = json.loads(output)
                        if "data" in parsed:
                            extracted_data = parsed["data"]
                            break  # 첫 번째 data 사용
                    except:
                        # JSON이 아니면 무시
                        continue

            return BeatyResponse(
                success=True,
                query=query,
                intent=intent,
                natural_response=result["response"],
                geojson=None,  # 향후 확장
                pois=extracted_data.get("pois") if extracted_data and "pois" in extracted_data else None,
                data=extracted_data,  # 전체 data 필드 포함
                chat_history=[
                    {
                        "type": msg.__class__.__name__,
                        "content": msg.content
                    }
                    for msg in result.get("chat_history", [])
                ],
                debug_info={
                    "intermediate_steps": len(intermediate_steps),
                    "tools_used": tools_used
                }
            )

        except Exception as e:
            print(f"[API/QUERY] 오류: {e}")
            import traceback
            traceback.print_exc()

            return BeatyResponse(
                success=False,
                query=request.query,
                intent="ERROR",
                natural_response=f"죄송해요, 처리 중 오류가 발생했어요: {str(e)}",
                debug_info={"error": str(e)}
            )

    @app.post("/api/clear-session")
    async def clear_session(authorization: Optional[str] = Header(None)):
        """세션 대화 히스토리 초기화"""
        try:
            session_id = None
            if authorization and authorization.startswith("Bearer "):
                session_token = authorization.replace("Bearer ", "")
                session_id = session_token[:32]

            agent.clear_session(session_id)

            return {
                "success": True,
                "message": "세션이 초기화되었어요."
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    return app


# ============================================================================
# MAIN
# ============================================================================

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
