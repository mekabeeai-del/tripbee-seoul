"""
Privacy Service - 인증 및 사용자 관리 서비스
포트: 8100
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import httpx

load_dotenv()

# =====================================================================================
# CONFIG
# =====================================================================================

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
    "password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ")
}

# =====================================================================================
# MODELS
# =====================================================================================

class OAuthLoginRequest(BaseModel):
    provider: str  # "google" or "apple"
    provider_user_id: str
    provider_email: str
    name: Optional[str] = None
    profile_image_url: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None

class SessionResponse(BaseModel):
    session_token: str
    user: dict
    expires_at: datetime

class TripSessionCreate(BaseModel):
    nationality: str
    purpose: list[str]
    interests: list[str]
    companions: str
    start_date: str  # "YYYY-MM-DD"
    end_date: str    # "YYYY-MM-DD"

# =====================================================================================
# APP
# =====================================================================================

app = FastAPI(title="Privacy Service - Auth & User Management", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================================
# DATABASE HELPERS
# =====================================================================================

def get_db_connection():
    """DB 연결 생성"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def generate_session_token():
    """세션 토큰 생성 (256bit random)"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """토큰 해싱 (저장용)"""
    return hashlib.sha256(token.encode()).hexdigest()

# =====================================================================================
# ENDPOINTS
# =====================================================================================

@app.get("/")
async def root():
    return {"service": "Privacy Service", "version": "1.0", "port": 8100}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/health-ui", response_class=HTMLResponse)
async def health_ui():
    """
    Health Dashboard UI
    - 회원 수
    - 접속자 수 (최근 24시간 내 활동)
    - DB 연결 상태
    - Google OAuth 연결 상태
    """
    # DB 연결 체크 및 통계 조회
    db_status = "❌ Disconnected"
    total_users = 0
    active_sessions = 0
    google_users = 0

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        db_status = "✅ Connected"

        # 총 회원 수
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
        total_users = cursor.fetchone()["count"]

        # 최근 24시간 내 활동 세션 수 (접속자 수)
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id) as count
            FROM user_sessions
            WHERE is_active = true
            AND last_accessed_at > NOW() - INTERVAL '24 hours'
        """)
        active_sessions = cursor.fetchone()["count"]

        # Google OAuth 연동 회원 수
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM user_oauth_providers
            WHERE provider = 'google'
        """)
        google_users = cursor.fetchone()["count"]

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[HEALTH-UI] DB Error: {e}")
        db_status = f"❌ Error: {str(e)[:50]}"

    # Google OAuth 연결 체크
    google_status = "✅ Available"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://accounts.google.com/.well-known/openid-configuration", timeout=3.0)
            if response.status_code != 200:
                google_status = "⚠️ Degraded"
    except Exception as e:
        google_status = f"❌ Unavailable"

    # HTML Dashboard
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Service Health Dashboard</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
                min-height: 100vh;
            }}

            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}

            .header {{
                text-align: center;
                color: white;
                margin-bottom: 40px;
            }}

            .header h1 {{
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 10px;
            }}

            .header p {{
                font-size: 16px;
                opacity: 0.9;
            }}

            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}

            .stat-card {{
                background: white;
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }}

            .stat-card:hover {{
                transform: translateY(-5px);
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
            }}

            .stat-card .icon {{
                font-size: 40px;
                margin-bottom: 15px;
            }}

            .stat-card .label {{
                font-size: 14px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }}

            .stat-card .value {{
                font-size: 36px;
                font-weight: 700;
                color: #333;
                margin-bottom: 10px;
            }}

            .stat-card .status {{
                font-size: 14px;
                color: #666;
            }}

            .status-section {{
                background: white;
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }}

            .status-section h2 {{
                font-size: 24px;
                margin-bottom: 20px;
                color: #333;
            }}

            .status-item {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
            }}

            .status-item:last-child {{
                border-bottom: none;
            }}

            .status-item .name {{
                font-size: 16px;
                color: #333;
                font-weight: 500;
            }}

            .status-item .badge {{
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
            }}

            .badge.success {{
                background: #d4edda;
                color: #155724;
            }}

            .badge.error {{
                background: #f8d7da;
                color: #721c24;
            }}

            .footer {{
                text-align: center;
                color: white;
                margin-top: 40px;
                opacity: 0.8;
            }}

            .refresh-btn {{
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background: white;
                color: #667eea;
                border-radius: 25px;
                text-decoration: none;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }}

            .refresh-btn:hover {{
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>☀️ Privacy Service</h1>
                <p>Health Dashboard - Port 8100</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon">👥</div>
                    <div class="label">Total Users</div>
                    <div class="value">{total_users:,}</div>
                    <div class="status">Active members</div>
                </div>

                <div class="stat-card">
                    <div class="icon">🔥</div>
                    <div class="label">Active Sessions</div>
                    <div class="value">{active_sessions:,}</div>
                    <div class="status">Last 24 hours</div>
                </div>

                <div class="stat-card">
                    <div class="icon">🔑</div>
                    <div class="label">Google OAuth</div>
                    <div class="value">{google_users:,}</div>
                    <div class="status">Connected accounts</div>
                </div>

                <div class="stat-card">
                    <div class="icon">💾</div>
                    <div class="label">Database</div>
                    <div class="value">{db_status.split()[0]}</div>
                    <div class="status">{db_status}</div>
                </div>
            </div>

            <div class="status-section">
                <h2>System Status</h2>
                <div class="status-item">
                    <span class="name">Database Connection</span>
                    <span class="badge {'success' if '✅' in db_status else 'error'}">{db_status}</span>
                </div>
                <div class="status-item">
                    <span class="name">Google OAuth Service</span>
                    <span class="badge {'success' if '✅' in google_status else 'error'}">{google_status}</span>
                </div>
                <div class="status-item">
                    <span class="name">API Server</span>
                    <span class="badge success">✅ Running</span>
                </div>
                <div class="status-item">
                    <span class="name">Service Port</span>
                    <span class="badge success">8100</span>
                </div>
            </div>

            <div class="footer">
                <a href="/health-ui" class="refresh-btn">🔄 Refresh Dashboard</a>
                <p style="margin-top: 20px;">Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """

    return html_content

@app.post("/api/auth/oauth/login")
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
            import uuid
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

        expires_at = datetime.utcnow() + timedelta(days=30)  # 30일
        refresh_expires_at = datetime.utcnow() + timedelta(days=90)  # 90일

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


@app.post("/api/auth/logout")
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


@app.get("/api/auth/me")
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

        session_id_value = session["id"]
        print(f"[PRIVACY/ME] session['id'] = {session_id_value}, type = {type(session_id_value)}")

        return {
            "success": True,
            "user": dict(user),
            "session_id": str(session_id_value)  # UUID를 문자열로 변환
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PRIVACY/ME] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================================
# TRIP SESSION ENDPOINTS
# =====================================================================================

def verify_session(authorization: Optional[str]) -> int:
    """세션 검증 및 user_id 반환"""
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


@app.get("/api/trip/categories")
async def get_categories():
    """
    KTO_TOUR_CATEGORY에서 CAT_LEVEL = 0인 카테고리 목록 조회
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT cat_code, name, keywords
            FROM KTO_TOUR_CATEGORY
            WHERE CAT_LEVEL = 0 AND lang = 'Kor'
            ORDER BY cat_code
        """)

        categories = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"success": True, "categories": [dict(cat) for cat in categories]}

    except Exception as e:
        print(f"[TRIP/CATEGORIES] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trip/active")
async def get_active_trip(authorization: Optional[str] = Header(None)):
    """현재 활성 여행 세션 조회"""
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, trip_id, user_id, nationality, purpose, interests,
                   companions, start_date, end_date, created_at, updated_at, is_active
            FROM trip_sessions
            WHERE user_id = %s
              AND is_active = true
              AND end_date >= CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))

        trip = cursor.fetchone()
        cursor.close()
        conn.close()

        if trip:
            return {"success": True, "trip": dict(trip)}
        else:
            return {"success": True, "trip": None}

    except Exception as e:
        print(f"[TRIP/ACTIVE] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trip/context")
async def get_trip_context(authorization: Optional[str] = Header(None)):
    """
    현재 활성 여행 세션의 컨텍스트 조회 (프론트엔드 UI용)
    - 현재 몇일차인지 계산
    - 관심사, 동행인, 여행목적 반환
    - 전체 여행 기간 및 타임라인 정보
    """
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, trip_id, user_id, nationality, purpose, interests,
                   companions, start_date, end_date, created_at, updated_at, is_active,
                   CURRENT_DATE - start_date + 1 as current_day,
                   end_date - start_date + 1 as total_days
            FROM trip_sessions
            WHERE user_id = %s
              AND is_active = true
              AND start_date <= CURRENT_DATE
              AND end_date >= CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))

        trip = cursor.fetchone()
        cursor.close()
        conn.close()

        if not trip:
            return {
                "success": True,
                "has_active_trip": False,
                "trip_context": None
            }

        # 응답 포맷팅
        trip_dict = dict(trip)

        return {
            "success": True,
            "has_active_trip": True,
            "trip_context": {
                "trip_id": trip_dict["trip_id"],
                "current_day": trip_dict["current_day"],
                "total_days": trip_dict["total_days"],
                "interests": trip_dict["interests"],  # array
                "companions": trip_dict["companions"],  # string
                "purpose": trip_dict["purpose"],  # array
                "nationality": trip_dict["nationality"],
                "start_date": trip_dict["start_date"].isoformat() if trip_dict["start_date"] else None,
                "end_date": trip_dict["end_date"].isoformat() if trip_dict["end_date"] else None
            }
        }

    except Exception as e:
        print(f"[TRIP/CONTEXT] 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trip/create")
async def create_trip_session(
    trip_data: TripSessionCreate,
    authorization: Optional[str] = Header(None)
):
    """새 여행 세션 생성"""
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 기존 활성 여행 비활성화
        cursor.execute("""
            UPDATE trip_sessions
            SET is_active = false, updated_at = NOW()
            WHERE user_id = %s AND is_active = true
        """, (user_id,))

        # 새 여행 세션 생성
        cursor.execute("""
            INSERT INTO trip_sessions
            (user_id, nationality, purpose, interests, companions, start_date, end_date, created_at, updated_at, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), true)
            RETURNING id, trip_id, user_id, nationality, purpose, interests, companions, start_date, end_date, created_at, updated_at, is_active
        """, (
            user_id,
            trip_data.nationality,
            trip_data.purpose,
            trip_data.interests,
            trip_data.companions,
            trip_data.start_date,
            trip_data.end_date
        ))

        new_trip = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "trip": dict(new_trip)}

    except Exception as e:
        print(f"[TRIP/CREATE] 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/trip/{trip_id}")
async def update_trip_session(
    trip_id: str,
    trip_data: TripSessionCreate,
    authorization: Optional[str] = Header(None)
):
    """여행 세션 수정 (기간 연장 등)"""
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE trip_sessions
            SET nationality = %s,
                purpose = %s,
                interests = %s,
                companions = %s,
                start_date = %s,
                end_date = %s,
                updated_at = NOW()
            WHERE trip_id = %s AND user_id = %s
            RETURNING id, trip_id, user_id, nationality, purpose, interests, companions, start_date, end_date, created_at, updated_at, is_active
        """, (
            trip_data.nationality,
            trip_data.purpose,
            trip_data.interests,
            trip_data.companions,
            trip_data.start_date,
            trip_data.end_date,
            trip_id,
            user_id
        ))

        updated_trip = cursor.fetchone()

        if not updated_trip:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Trip not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "trip": dict(updated_trip)}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[TRIP/UPDATE] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/trip/{trip_id}")
async def delete_trip_session(
    trip_id: str,
    authorization: Optional[str] = Header(None)
):
    """여행 세션 삭제 (비활성화)"""
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE trip_sessions
            SET is_active = false, updated_at = NOW()
            WHERE trip_id = %s AND user_id = %s
        """, (trip_id, user_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Trip session deleted successfully"}

    except Exception as e:
        print(f"[TRIP/DELETE] 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================================
# QUERY HISTORY ENDPOINTS
# =====================================================================================

@app.get("/api/history/queries")
async def get_query_history(
    authorization: Optional[str] = Header(None),
    limit: int = 20
):
    """
    사용자의 대화기록 조회 (query_logs 테이블에서)

    Args:
        limit: 최대 개수 (기본 20개)

    Returns:
        {
            "success": true,
            "queries": [
                {
                    "id": 1,
                    "query_text": "홍대까지 어떻게가?",
                    "intent": "ROUTE",
                    "result_count": 5,
                    "beaty_response_text": "...",
                    "final_result": {...},
                    "created_at": "2025-01-15T10:30:00"
                },
                ...
            ]
        }
    """
    user_id = verify_session(authorization)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, query_text, intent, result_count,
                   beaty_response_text, beaty_response_type,
                   final_result, created_at
            FROM query_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))

        queries = cursor.fetchall()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "queries": [dict(q) for q in queries]
        }

    except Exception as e:
        print(f"[HISTORY/QUERIES] 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================================
# MAIN
# =====================================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
