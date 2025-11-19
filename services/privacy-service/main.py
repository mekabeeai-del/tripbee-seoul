"""
Privacy Service - 인증 및 사용자 관리 서비스
포트: 8100

리팩토링 완료:
- 모듈화된 구조
- OAuth 로그인/로그아웃
- 세션 관리
- 헬스 체크 UI
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import SERVICE_NAME, SERVICE_VERSION, SERVICE_PORT
from auth import oauth_router
from health import router as health_router

# =====================================================================================
# APP
# =====================================================================================

app = FastAPI(title=SERVICE_NAME, version=SERVICE_VERSION)

# CORS - Gateway만 허용 (Frontend는 Gateway를 통해서만 접근)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Gateway (로컬)
        "https://gateway-service.onrender.com"  # Gateway (프로덕션)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================================
# ROUTERS
# =====================================================================================

# Auth Router (OAuth 로그인/로그아웃, 사용자 정보)
app.include_router(oauth_router)

# Health Router (헬스 체크, 대시보드 UI)
app.include_router(health_router)

# =====================================================================================
# ROOT
# =====================================================================================

@app.get("/")
async def root():
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "port": SERVICE_PORT,
        "endpoints": {
            "auth": {
                "login": "POST /api/auth/oauth/login",
                "logout": "POST /api/auth/logout",
                "me": "GET /api/auth/me"
            },
            "health": {
                "check": "GET /health",
                "dashboard": "GET /health-ui"
            }
        }
    }

# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
