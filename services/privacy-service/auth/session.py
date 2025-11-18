"""
Privacy Service - Session Management
"""

from datetime import datetime
from typing import Optional
from fastapi import HTTPException
from database import get_db_connection, hash_token


def verify_session(authorization: Optional[str]) -> int:
    """
    세션 검증 및 user_id 반환

    Args:
        authorization: Bearer 토큰이 포함된 Authorization 헤더

    Returns:
        user_id: 인증된 사용자 ID

    Raises:
        HTTPException: 인증 실패 시
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_token = authorization.replace("Bearer ", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_id, expires_at
        FROM user_sessions
        WHERE session_token = %s AND is_active = true
    """, (hash_token(session_token),))

    session = cursor.fetchone()
    cursor.close()
    conn.close()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if session["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired")

    return session["user_id"]
