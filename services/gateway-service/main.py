"""
Gateway Service - API Gateway with Dynamic Routing
포트: 8080

기능:
- DB 기반 동적 라우팅
- Admin UI (서비스 추가/수정/삭제)
- 프록시 (백엔드 서비스로 요청 전달)
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from config import SERVICE_NAME, SERVICE_VERSION, SERVICE_PORT, ALLOWED_ORIGINS
from admin import router as admin_router
from proxy import load_routes_to_cache, reload_routes, proxy_request

# =====================================================================================
# APP
# =====================================================================================

app = FastAPI(title=SERVICE_NAME, version=SERVICE_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================================
# STARTUP
# =====================================================================================

@app.on_event("startup")
async def startup():
    """서버 시작 시 DB에서 라우트 로드"""
    print(f"\n{'='*60}")
    print(f"[GATEWAY] {SERVICE_NAME} v{SERVICE_VERSION}")
    print(f"{'='*60}\n")

    load_routes_to_cache()

    print(f"\n[OK] Gateway Ready on port {SERVICE_PORT}")
    print(f"[ADMIN] Admin UI: http://localhost:{SERVICE_PORT}/admin/ui")
    print(f"{'='*60}\n")


# =====================================================================================
# ROUTERS
# =====================================================================================

# Admin Router (서비스 관리 UI)
app.include_router(admin_router)


# =====================================================================================
# ROOT & UTILS (catch_all 보다 먼저 정의)
# =====================================================================================

@app.get("/")
async def root():
    from proxy import ROUTE_CACHE

    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "port": SERVICE_PORT,
        "routes": {
            prefix: target
            for prefix, target in ROUTE_CACHE.items()
        },
        "admin_ui": f"http://localhost:{SERVICE_PORT}/admin/ui"
    }


@app.post("/reload-routes")
async def reload_routes_endpoint():
    """라우트 새로고침 (Admin에서 변경 후 호출)"""
    return reload_routes()


# =====================================================================================
# DYNAMIC PROXY (가장 마지막에 정의 - catch all)
# =====================================================================================

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def catch_all(request: Request, path: str):
    """
    모든 요청을 받아서 동적으로 프록시

    예시:
    - /api/auth/login → Privacy Service (http://localhost:8100/login)
    - /api/beaty/chat → Beaty Service (http://localhost:8000/chat)
    """
    return await proxy_request(request, path)


# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
