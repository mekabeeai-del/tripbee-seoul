"""
Database Connection Utils
DB 연결 유틸리티 (psycopg2, asyncpg 모두 지원)
"""

import ssl
import asyncpg
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional
from config import CONFIG


def get_sync_db_connection():
    """동기 DB 연결 (psycopg2)"""
    try:
        return psycopg2.connect(
            host=CONFIG["db_host"],
            port=CONFIG["db_port"],
            database=CONFIG["db_name"],
            user=CONFIG["db_user"],
            password=CONFIG["db_password"],
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"[DB] Sync connection error: {e}")
        raise


async def get_async_db_connection():
    """비동기 DB 연결 (asyncpg)"""
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        conn = await asyncpg.connect(
            host=CONFIG["db_host"],
            port=CONFIG["db_port"],
            database=CONFIG["db_name"],
            user=CONFIG["db_user"],
            password=CONFIG["db_password"],
            ssl=ssl_context,
            command_timeout=60
        )
        return conn
    except Exception as e:
        print(f"[DB] Async connection error: {e}")
        raise
