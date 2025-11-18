"""
Privacy Service - Database Helpers
"""

import secrets
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG


def get_db_connection():
    """DB 연결 생성"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def generate_session_token() -> str:
    """세션 토큰 생성 (256bit random)"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """토큰 해싱 (저장용)"""
    return hashlib.sha256(token.encode()).hexdigest()
