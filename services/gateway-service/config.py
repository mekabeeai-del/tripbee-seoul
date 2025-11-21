"""
Gateway Service - Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Environment (local or prod)
ENVIRONMENT = os.getenv("ENVIRONMENT", "local")

# Database Configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
    "password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ")
}

# Service Configuration
SERVICE_PORT = 8080
SERVICE_NAME = "Gateway Service"
SERVICE_VERSION = "1.0"

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # 로컬 개발
    "https://tripbee-seoul.vercel.app"  # 프로덕션
]

# Backend Service URLs (환경별)
SERVICE_URLS = {
    "local": {
        "privacy": "http://localhost:8100",
        "beaty": "http://localhost:8000",
        "poi": "http://localhost:8001",
        "route": "http://localhost:8002",
        "beatmap": "http://localhost:8200"
    },
    "prod": {
        "privacy": "https://privacy-service.onrender.com",
        "beaty": "https://beaty-service.onrender.com",
        "poi": "https://poi-service.onrender.com",
        "route": "https://route-service.onrender.com",
        "beatmap": "https://beatmap-service.onrender.com"
    }
}


def get_service_url(service_key: str) -> str:
    """환경에 맞는 서비스 URL 반환"""
    return SERVICE_URLS.get(ENVIRONMENT, SERVICE_URLS["local"]).get(service_key, service_key)
