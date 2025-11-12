"""
POI Service - 통합 POI 검색/추천 서비스
Port: 8001

통합된 서비스:
- Recommend: 감정 기반 POI 추천
- FindPlace: Google Places 장소 검색
- Random: 무작위 POI 추천
- Landmark: 필수 명소 제공
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from services import (
    RecommendService, RecommendRequest,
    GoogleService, GoogleRequest,
    RandomPoiService,
    LandmarkService, LandmarkRequest,
    KtoService, POIMetadata
)

# =====================================================================================
# FASTAPI APP
# =====================================================================================

app = FastAPI(
    title="POI Service - 통합 POI 검색/추천",
    version="1.0.0",
    description="Recommend, FindPlace, Random, Landmark 통합 서비스"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================================
# SERVICE INSTANCES
# =====================================================================================

recommend_service = RecommendService()
google_service = GoogleService()
random_service = RandomPoiService()
landmark_service = LandmarkService()
kto_service = KtoService()

# =====================================================================================
# API ENDPOINTS
# =====================================================================================

@app.get("/")
async def root():
    """서비스 정보"""
    return {
        "service": "POI Service",
        "version": "1.0.0",
        "port": 8001,
        "endpoints": {
            "recommend": "POST /api/recommend - 감정 기반 POI 추천",
            "google_search": "POST /api/google/search - Google Places 검색",
            "random": "GET /api/random - 무작위 POI 추천",
            "landmark": "POST /api/landmark - 필수 명소 제공",
            "kto_list": "GET /api/kto/list - KTO POI 메타데이터 목록",
            "kto_detail": "GET /api/kto/detail/{content_id} - KTO POI 상세정보"
        }
    }


@app.post("/api/recommend")
async def recommend(request: RecommendRequest):
    """
    POI 추천 검색 (감정 벡터 + 카테고리 + 지오메트리)

    Request:
        {
            "query_text": "조용한 카페 추천해줘",
            "category": {"cat_code": "A05", "cat_level": 1, "content_type_id": "39"},
            "geometry_id": 123,
            "user_location": {"lat": 37.5665, "lng": 126.9780},
            "preferences": {"emotions": ["조용한", "힐링"]},
            "core_keywords": ["카페"],
            "limit": 10
        }
    """
    try:
        results = await recommend_service.search_pois(request)
        return {
            "success": True,
            "query": request.query_text,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/google/search")
async def google_search(request: GoogleRequest):
    """
    Google Places 장소 검색

    Request:
        {
            "keyword": "명동 우동",
            "user_lat": 37.5665,
            "user_lng": 126.9780,
            "limit": 5,
            "language": "ko",
            "filters": {
                "parking": true,
                "open_now": true,
                "min_rating": 4.0
            }
        }
    """
    try:
        result = await google_service.search(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/random")
async def random_poi(
    lat: Optional[float] = None,
    lng: Optional[float] = None
):
    """
    무작위 POI 추천

    Query Parameters:
        lat: 사용자 위도 (optional)
        lng: 사용자 경도 (optional)
        - lat/lng 제공 시 반경 1.5km 이내 POI만 조회

    Response:
        {
            "success": true,
            "poi": {
                "content_id": "126508",
                "title": "경복궁",
                "addr1": "...",
                "mapx": 126.9770,
                "mapy": 37.5796,
                "first_image": "http://...",
                "overview": "...",
                "beaty_description": "비티가 소개하는 2줄 설명"
            }
        }
    """
    try:
        result = random_service.get_random_poi(lat=lat, lng=lng)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/landmark")
async def landmark(request: LandmarkRequest):
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
                    "addr1": "...",
                    "mapx": 126.9770,
                    "mapy": 37.5796,
                    "first_image": "http://..."
                }
            ]
        }
    """
    try:
        result = landmark_service.get_landmarks(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/kto/list")
async def kto_list():
    """
    KTO POI 메타데이터 목록 조회 (경량)

    클라이언트에서 전체 로드 후 BBOX/Zoom 필터링에 사용

    Response:
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
        pois = kto_service.get_all_metadata()
        return pois
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/kto/detail/{content_id}")
async def kto_detail(content_id: str):
    """
    KTO POI 상세 정보 조회

    마커 클릭 시 상세 정보(overview, images 등)를 가져올 때 사용

    Response:
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
        poi_detail = kto_service.get_poi_detail(content_id)
        return poi_detail
    except Exception as e:
        if "찾을 수 없습니다" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """헬스체크"""
    return {
        "status": "healthy",
        "service": "POI Service",
        "port": 8001
    }


# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("POI Service 시작")
    print("Port: 8001")
    print("=" * 60)
    print("통합 서비스:")
    print("  - Recommend (감정 기반 POI 추천)")
    print("  - Google (Google Places 검색)")
    print("  - Random (무작위 POI 추천)")
    print("  - Landmark (필수 명소)")
    print("  - KTO (KTO POI 메타데이터 & 상세정보)")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8001)
