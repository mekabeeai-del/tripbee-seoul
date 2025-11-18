"""
Privacy Service - Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
    "password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ")
}

# Session Configuration
SESSION_EXPIRY_DAYS = 30  # 세션 만료 기간 (일)
REFRESH_TOKEN_EXPIRY_DAYS = 90  # 리프레시 토큰 만료 기간 (일)

# Service Configuration
SERVICE_PORT = 8100
SERVICE_NAME = "Privacy Service"
SERVICE_VERSION = "1.0"
