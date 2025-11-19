"""
Gateway Service - Database Helpers
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG, get_service_url


def get_db_connection():
    """DB 연결 생성"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def get_active_routes():
    """활성화된 라우트 목록 조회 (환경별 URL 치환)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, service_name, target_url, prefix, swagger_url, is_active
        FROM gateway_routes
        WHERE is_active = true
        ORDER BY prefix
    """)

    routes = cursor.fetchall()
    cursor.close()
    conn.close()

    # DB의 service_key를 실제 URL로 치환
    for route in routes:
        route['target_url'] = get_service_url(route['target_url'])

    return routes
