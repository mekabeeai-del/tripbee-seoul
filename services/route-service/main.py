from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
from odsay_client import ODSayClient


# Config
ODSAY_API_KEY = "0fP4Bf8OT85XLCtcE93DwY6ntzJeAYMMheJmLaaTf4k"
PORT = 8002


# Pydantic Models
class Coordinate(BaseModel):
    lat: float
    lng: float


class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    waypoints: Optional[List[Coordinate]] = []
    route_preference: Optional[str] = "fastest"  # fastest, min_transfer, min_walk
    transportation_mode: Optional[str] = None  # subway, bus, null


class RouteResponse(BaseModel):
    success: bool
    paths: List[Dict[str, Any]]
    geojson: Optional[Dict[str, Any]]
    summary: Optional[Dict[str, Any]]
    error: Optional[str] = None


# FastAPI App
app = FastAPI(
    title="Route Service",
    description="ODSay 기반 대중교통 경로 검색 서비스",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ODSay Client
odsay_client = ODSayClient(ODSAY_API_KEY)


@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 클라이언트 정리"""
    await odsay_client.close()


@app.get("/health")
async def health_check():
    """헬스체크"""
    return {"status": "healthy", "service": "route-service"}


@app.post("/api/route", response_model=RouteResponse)
async def search_route(request: RouteRequest):
    """
    대중교통 경로 검색

    Args:
        request: 출발지/도착지 좌표 및 옵션

    Returns:
        경로 검색 결과 + GeoJSON
    """
    try:
        # route_preference 매핑
        search_type_map = {
            "fastest": 0,
            "min_transfer": 1,
            "min_walk": 2
        }
        search_type = search_type_map.get(request.route_preference, 0)

        # transportation_mode 매핑
        search_path_type_map = {
            "subway": 1,
            "bus": 2,
            None: 0
        }
        search_path_type = search_path_type_map.get(request.transportation_mode, 0)

        # 경유지 있으면 에러 (현재 미지원)
        if request.waypoints and len(request.waypoints) > 0:
            raise HTTPException(
                status_code=400,
                detail="경유지는 현재 지원하지 않습니다"
            )

        # 경로 검색 + 그래픽 데이터
        print(f"Searching route: ({request.origin.lng}, {request.origin.lat}) -> ({request.destination.lng}, {request.destination.lat})")
        result = await odsay_client.get_route_with_geometry(
            start_x=request.origin.lng,
            start_y=request.origin.lat,
            end_x=request.destination.lng,
            end_y=request.destination.lat,
            search_type=search_type,
            search_path_type=search_path_type
        )

        print(f"Result: {result}")
        paths = result.get("paths", [])
        geojson = result.get("geometry")
        print(f"Paths count: {len(paths)}")

        # 요약 정보 생성
        summary = None
        if len(paths) > 0:
            first_path = paths[0]
            info = first_path.get("info", {})

            summary = {
                "total_time": info.get("totalTime"),  # 분
                "total_distance": info.get("trafficDistance"),  # 미터
                "total_walk": info.get("totalWalk"),  # 미터
                "payment": info.get("payment"),  # 원
                "bus_transit_count": info.get("busTransitCount", 0),
                "subway_transit_count": info.get("subwayTransitCount", 0),
                "path_type": first_path.get("pathType")  # 1:지하철, 2:버스, 3:버스+지하철
            }

        return RouteResponse(
            success=True,
            paths=paths,
            geojson=geojson,
            summary=summary
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        return RouteResponse(
            success=False,
            paths=[],
            geojson=None,
            summary=None,
            error=str(e)
        )


@app.get("/")
async def root():
    """루트"""
    return {
        "service": "route-service",
        "version": "1.0.0",
        "port": PORT,
        "endpoints": {
            "route_search": "POST /api/route",
            "health": "GET /health"
        }
    }


if __name__ == "__main__":
    import sys
    sys.stdout.flush()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="debug"
    )
