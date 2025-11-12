"""
Beaty Service - TripBee AI 캐릭터 서비스
외부 서비스 의존성 없이 자체적으로 모든 기능 수행
포트: 8000
"""

import json
import httpx
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

# 로컬 모듈 임포트
from intent_classifier import IntentClassifier
from category_resolver import CategoryResolver
from position_resolver import PositionResolver
from query_rewriter import QueryRewriter

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

        # Initialize internal modules
        self.intent_classifier = IntentClassifier(self.openai_api_key)
        self.category_resolver = CategoryResolver(self.openai_api_key, self.db_config)
        self.position_resolver = PositionResolver(self.openai_api_key, self.db_config)
        self.query_rewriter = QueryRewriter(self.openai_api_key)

        # Recommend service endpoint (still external)
        self.recommend_url = "http://localhost:8001"

    async def get_recommendations(
        self,
        query: str,
        category: Optional[Dict],
        geometry_id: Optional[int],
        user_location: Optional[UserLocation],
        hard_constraints: List[str],
        emotion: Optional[str],
        filters: Optional[Dict] = None,
        preferences: Optional[Dict] = None,
        core_keywords: Optional[List[str]] = None
    ) -> List[Dict]:
        """Recommend 서비스 호출 - POI 검색"""
        try:
            # filters와 preferences가 제공되지 않으면 기존 방식대로 변환
            if filters is None:
                filters = {}
                for constraint in hard_constraints:
                    if "주차" in constraint:
                        filters["is_parking_available"] = True
                    elif "무료" in constraint:
                        filters["is_free_admission"] = True
                    elif "카드" in constraint:
                        filters["is_credit_card_ok"] = True
                    elif "24시간" in constraint or "24시" in constraint:
                        filters["is_currently_open"] = True

            if preferences is None:
                preferences = {}
                if emotion:
                    preferences["emotions"] = [e.strip() for e in emotion.split(",")]

            request_data = {
                "query_text": query,
                "category": category,
                "geometry_id": geometry_id,
                "user_location": user_location.dict() if user_location else None,
                "filters": filters if (filters and len(filters) > 0) else None,
                "preferences": preferences if (preferences and len(preferences) > 0) else None,
                "core_keywords": core_keywords if (core_keywords and len(core_keywords) > 0) else None,
                "limit": 10
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.recommend_url}/api/recommend",
                    json=request_data
                )
                response.raise_for_status()
                result = response.json()
                print(f"[BEATY] Recommend response: count={result.get('count')}, results length={len(result.get('results', []))}")
                return result.get("results", [])

        except Exception as e:
            print(f"[BEATY] Recommend error: {e}")
            return []

    def generate_natural_response(
        self,
        query: str,
        intent: str,
        pois: List[Dict],
        classification: Dict
    ) -> str:
        """Beaty 캐릭터로 자연어 응답 생성"""
        try:
            # 컨텍스트 구성
            context_parts = [f"사용자 질문: {query}"]
            context_parts.append(f"의도: {intent}")

            if classification.get("location_keyword"):
                context_parts.append(f"위치: {classification.get('location_keyword')}")
            if classification.get("category_text"):
                context_parts.append(f"카테고리: {classification.get('category_text')}")
            if classification.get("emotion"):
                context_parts.append(f"분위기: {classification.get('emotion')}")

            if pois:
                context_parts.append(f"\n찾은 장소 ({len(pois)}개):")
                for i, poi in enumerate(pois[:5], 1):
                    context_parts.append(f"{i}. {poi.get('title')} - {poi.get('addr1', 'N/A')}")

            context = "\n".join(context_parts)

            # Beaty 캐릭터 프롬프트
            system_prompt = """당신은 TripBee 서비스의 AI 캐릭터 'Beaty'입니다.

특징:
- 친근하고 밝은 성격
- 서울 여행 전문가
- 간결하고 유용한 정보 제공
- 이모티콘은 사용하지 않음
- 존댓말 사용

응답 가이드:
- 찾은 장소가 있으면 구체적으로 추천
- 없으면 일반적인 안내나 대안 제시
- 2-4문장으로 간결하게
"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.7,
                max_tokens=300
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"[BEATY] Response generation error: {e}")
            return "죄송합니다. 응답을 생성하는 중에 문제가 발생했습니다."

    def create_geojson(self, pois: List[Dict]) -> Dict:
        """POI 리스트를 GeoJSON FeatureCollection으로 변환"""
        features = []

        for poi in pois:
            if poi.get("mapx") and poi.get("mapy"):
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [poi["mapx"], poi["mapy"]]
                    },
                    "properties": {
                        "content_id": poi.get("content_id"),
                        "title": poi.get("title"),
                        "addr1": poi.get("addr1"),
                        "first_image": poi.get("first_image"),
                        "emotion_score": poi.get("emotion_score", 0),
                        "distance_km": poi.get("distance_km", 0)
                    }
                }
                features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features
        }

    async def process_query(self, request: BeatyRequest) -> BeatyResponse:
        """전체 쿼리 처리 파이프라인"""
        print(f"\n[BEATY] Processing query: {request.query}")

        # 1. 의도 분류 (내장)
        print("[BEATY] Step 1: Intent classification")
        classification = self.intent_classifier.classify(request.query)
        intent = classification.get("intent", "GENERAL_CHAT")
        print(f"[BEATY] Intent: {intent}")

        # 2. GENERAL_CHAT이면 바로 응답
        if intent == "GENERAL_CHAT":
            natural_response = self.generate_natural_response(
                request.query, intent, [], classification
            )
            return BeatyResponse(
                success=True,
                query=request.query,
                intent=intent,
                natural_response=natural_response,
                geojson=None,
                pois=None,
                debug_info={"classification": classification}
            )

        # 3. 카테고리 해결 (내장)
        category = None
        if classification.get("category_text"):
            print(f"[BEATY] Step 2: Resolving category: {classification.get('category_text')}")
            category_full = await self.category_resolver.resolve(classification.get("category_text"))
            if category_full:
                category = {
                    "cat_code": category_full.get("cat_code"),
                    "cat_level": category_full.get("cat_level"),
                    "content_type_id": str(category_full.get("content_type_id"))
                }
            print(f"[BEATY] Category: {category}")

        # 4. 위치 해결 (내장)
        geometry_id = None
        if classification.get("location_keyword"):
            print(f"[BEATY] Step 3: Resolving position: {classification.get('location_keyword')}")
            position = await self.position_resolver.resolve(classification.get("location_keyword"))
            if position:
                geometry_id = position.get("geometry_id")
            print(f"[BEATY] Geometry ID: {geometry_id}")

        # 5. 쿼리 리라이트 (내장)
        rewritten_query = None
        if intent in ["RECOMMEND", "FIND_PLACE"]:
            print(f"[BEATY] Step 4: Query rewriting")
            rewritten_query = self.query_rewriter.rewrite(
                request.query,
                intent,
                category,
                geometry_id,
                request.user_location.dict() if request.user_location else None,
                classification.get("hard_constraints", []),
                classification.get("emotion")
            )
            print(f"[BEATY] Rewritten: {rewritten_query.get('query_text')}")

        # 6. POI 검색 (외부 Recommend 서비스)
        pois = []
        if intent in ["RECOMMEND", "FIND_PLACE"] and rewritten_query:
            print(f"[BEATY] Step 5: Getting recommendations")

            # 리라이트된 쿼리 정보 사용
            query_text = rewritten_query.get("query_text", request.query)
            filters = rewritten_query.get("filters")
            preferences = rewritten_query.get("preferences")

            pois = await self.get_recommendations(
                query_text,
                category,
                geometry_id,
                request.user_location,
                [],  # hard_constraints는 이미 filters로 변환됨
                None,  # emotion도 이미 preferences로 변환됨
                filters,
                preferences
            )
            print(f"[BEATY] Found {len(pois)} POIs")

        # 7. 자연어 응답 생성
        print("[BEATY] Step 6: Generating natural response")
        natural_response = self.generate_natural_response(
            request.query,
            intent,
            pois,
            classification
        )

        # 8. GeoJSON 생성
        geojson = None
        if pois:
            geojson = self.create_geojson(pois)

        return BeatyResponse(
            success=True,
            query=request.query,
            intent=intent,
            natural_response=natural_response,
            geojson=geojson,
            pois=pois,
            debug_info={
                "classification": classification,
                "category": category,
                "geometry_id": geometry_id,
                "rewritten_query": rewritten_query,
                "poi_count": len(pois)
            }
        )

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

    @app.post("/api/chat", response_model=BeatyResponse)
    async def chat(request: BeatyRequest):
        """Beaty와 대화 - 전체 파이프라인"""
        try:
            return await service.process_query(request)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # 단계별 테스트 엔드포인트
    @app.post("/api/step1/classify")
    async def step1_classify(request: dict):
        """Step 1: 의도분류/슬롯추출"""
        try:
            query = request.get("query")
            if not query:
                raise HTTPException(status_code=400, detail="query is required")

            classification = service.intent_classifier.classify(query)
            return {"classification": classification}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/step2/category")
    async def step2_category(request: dict):
        """Step 2: 카테고리 해결"""
        try:
            category_text = request.get("category_text")
            if not category_text:
                raise HTTPException(status_code=400, detail="category_text is required")

            category = await service.category_resolver.resolve(category_text)
            return {"category": category}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/step3/position")
    async def step3_position(request: dict):
        """Step 3: 거점위치 해결"""
        try:
            location_keyword = request.get("location_keyword")
            if not location_keyword:
                raise HTTPException(status_code=400, detail="location_keyword is required")

            position = await service.position_resolver.resolve(location_keyword)
            return {"position": position}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/step4/rewrite")
    async def step4_rewrite(request: dict):
        """Step 4: 쿼리 리라이트 (GPT)"""
        try:
            query = request.get("query")
            intent = request.get("intent")
            category = request.get("category")
            geometry_id = request.get("geometry_id")
            user_location = request.get("user_location")
            hard_constraints = request.get("hard_constraints", [])
            emotion = request.get("emotion")

            rewritten = service.query_rewriter.rewrite(
                query,
                intent,
                category,
                geometry_id,
                user_location,
                hard_constraints,
                emotion
            )

            return {"rewritten_query": rewritten}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/step5/recommend")
    async def step5_recommend(request: dict):
        """Step 5: POI 추천 검색 (Recommend 서비스 호출)"""
        try:
            query_text = request.get("query_text")
            category = request.get("category")
            geometry_id = request.get("geometry_id")
            user_location_data = request.get("user_location")
            filters = request.get("filters")
            preferences = request.get("preferences")
            core_keywords = request.get("core_keywords")

            user_location = None
            if user_location_data:
                user_location = UserLocation(**user_location_data)

            pois = await service.get_recommendations(
                query_text,
                category,
                geometry_id,
                user_location,
                [],  # hard_constraints는 이미 filters로 변환됨
                None,  # emotion도 이미 preferences로 변환됨
                filters,
                preferences,
                core_keywords
            )
            return {"pois": pois, "count": len(pois)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/step6/generate-response")
    async def step6_generate_response(request: dict):
        """Step 6: 자연어 응답 생성 (Step 5 결과를 자연어로 가공)"""
        try:
            query = request.get("query")
            intent = request.get("intent")
            pois = request.get("pois", [])
            classification = request.get("classification", {})

            print(f"[STEP6] Generating natural response for {len(pois)} POIs")

            natural_response = service.generate_natural_response(
                query,
                intent,
                pois,
                classification
            )

            # GeoJSON 생성
            geojson = None
            if pois:
                geojson = service.create_geojson(pois)

            return {
                "natural_response": natural_response,
                "geojson": geojson
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/system-prompt")
    async def get_system_prompt():
        """의도분류 시스템 프롬프트 가져오기"""
        return {"system_prompt": service.intent_classifier.system_prompt}

    @app.post("/api/system-prompt")
    async def update_system_prompt(request: dict):
        """의도분류 시스템 프롬프트 업데이트"""
        try:
            new_prompt = request.get("new_prompt")
            if not new_prompt:
                raise HTTPException(status_code=400, detail="new_prompt is required")

            success = service.intent_classifier.save_system_prompt(new_prompt)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save system prompt")

            return {"success": True, "message": "시스템 프롬프트가 파일에 저장되었습니다."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/rewrite-prompt")
    async def get_rewrite_prompt():
        """쿼리 리라이트 시스템 프롬프트 가져오기"""
        return {"system_prompt": service.query_rewriter.system_prompt}

    @app.post("/api/rewrite-prompt")
    async def update_rewrite_prompt(request: dict):
        """쿼리 리라이트 시스템 프롬프트 업데이트"""
        try:
            new_prompt = request.get("new_prompt")
            if not new_prompt:
                raise HTTPException(status_code=400, detail="new_prompt is required")

            success = service.query_rewriter.save_system_prompt(new_prompt)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save rewrite prompt")

            return {"success": True, "message": "리라이트 프롬프트가 파일에 저장되었습니다."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/health")
    async def health():
        return {"status": "healthy", "character": "Beaty"}

    return app

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
