"""
Privacy Service - OAuth Authentication
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from models import OAuthLoginRequest, SessionResponse, UserResponse, LogoutResponse
from database import get_db_connection, generate_session_token, hash_token
from config import SESSION_EXPIRY_DAYS, REFRESH_TOKEN_EXPIRY_DAYS

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/oauth/login", response_model=SessionResponse)
async def oauth_login(request: OAuthLoginRequest):
    """
    OAuth 로그인 (Google/Apple)

    1. provider_user_id로 user_oauth_providers 테이블에서 사용자 조회
    2. 없으면 신규 사용자 생성 + OAuth 연동
    3. 있으면 기존 사용자 정보 업데이트
    4. 세션 생성 후 session_token 반환
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. OAuth provider로 기존 사용자 조회
        cursor.execute("""
            SELECT user_id FROM user_oauth_providers
            WHERE provider = %s AND provider_user_id = %s
        """, (request.provider, request.provider_user_id))

        oauth_record = cursor.fetchone()

        if oauth_record:
            # 기존 사용자
            user_id = oauth_record["user_id"]

            # user_oauth_providers 업데이트 (토큰 갱신)
            cursor.execute("""
                UPDATE user_oauth_providers
                SET provider_email = %s,
                    access_token_encrypted = %s,
                    refresh_token_encrypted = %s,
                    token_expires_at = %s,
                    last_used_at = NOW()
                WHERE provider = %s AND provider_user_id = %s
            """, (
                request.provider_email,
                request.access_token,
                request.refresh_token,
                request.token_expires_at,
                request.provider,
                request.provider_user_id
            ))

            # users 테이블 업데이트 (last_login_at)
            cursor.execute("""
                UPDATE users
                SET last_login_at = NOW(),
                    profile_image_url = COALESCE(%s, profile_image_url)
                WHERE id = %s
            """, (request.profile_image_url, user_id))

        else:
            # 신규 사용자 생성
            user_uuid = str(uuid.uuid4())

            cursor.execute("""
                INSERT INTO users (
                    uuid, email, name, profile_image_url,
                    status, email_verified, created_at, updated_at, last_login_at
                )
                VALUES (%s, %s, %s, %s, 'active', true, NOW(), NOW(), NOW())
                RETURNING id
            """, (
                user_uuid,
                request.provider_email,
                request.name or request.provider_email.split('@')[0],
                request.profile_image_url
            ))

            user_id = cursor.fetchone()["id"]

            # OAuth provider 연동 생성
            cursor.execute("""
                INSERT INTO user_oauth_providers (
                    user_id, provider, provider_user_id, provider_email,
                    access_token_encrypted, refresh_token_encrypted,
                    token_expires_at, connected_at, last_used_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                user_id,
                request.provider,
                request.provider_user_id,
                request.provider_email,
                request.access_token,
                request.refresh_token,
                request.token_expires_at
            ))

        conn.commit()

        # 2. 세션 생성
        session_token = generate_session_token()
        refresh_token = generate_session_token()

        expires_at = datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS)
        refresh_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)

        cursor.execute("""
            INSERT INTO user_sessions (
                user_id, session_token, refresh_token,
                expires_at, refresh_expires_at, is_active, created_at, last_accessed_at
            )
            VALUES (%s, %s, %s, %s, %s, true, NOW(), NOW())
            RETURNING id
        """, (
            user_id,
            hash_token(session_token),
            hash_token(refresh_token),
            expires_at,
            refresh_expires_at
        ))

        conn.commit()

        # 3. 사용자 정보 조회
        cursor.execute("""
            SELECT id, uuid, email, name, profile_image_url,
                   language_preference, timezone, status
            FROM users
            WHERE id = %s
        """, (user_id,))

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "session_token": session_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "user": dict(user)
        }

    except Exception as e:
        print(f"[PRIVACY/OAUTH_LOGIN] 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout", response_model=LogoutResponse)
async def logout(authorization: Optional[str] = Header(None)):
    """
    로그아웃 (세션 무효화)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_token = authorization.replace("Bearer ", "")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE user_sessions
            SET is_active = false, revoked_at = NOW(), revoked_reason = 'logout'
            WHERE session_token = %s
        """, (hash_token(session_token),))

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Logged out successfully"}

    except Exception as e:
        print(f"[PRIVACY/LOGOUT] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    현재 로그인한 사용자 정보 조회
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_token = authorization.replace("Bearer ", "")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 세션 조회 및 검증
        cursor.execute("""
            SELECT id, user_id, expires_at
            FROM user_sessions
            WHERE session_token = %s AND is_active = true
        """, (hash_token(session_token),))

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        if session["expires_at"] < datetime.utcnow():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=401, detail="Session expired")

        # 사용자 정보 조회
        cursor.execute("""
            SELECT id, uuid, email, name, profile_image_url,
                   language_preference, timezone, status
            FROM users
            WHERE id = %s
        """, (session["user_id"],))

        user = cursor.fetchone()

        # last_accessed_at 업데이트
        cursor.execute("""
            UPDATE user_sessions
            SET last_accessed_at = NOW()
            WHERE session_token = %s
        """, (hash_token(session_token),))

        conn.commit()
        cursor.close()
        conn.close()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "user": dict(user),
            "session_id": str(session["id"])
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PRIVACY/ME] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))
