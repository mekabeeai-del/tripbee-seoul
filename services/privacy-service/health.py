"""
Privacy Service - Health Check & Dashboard
"""

from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import httpx
from database import get_db_connection

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    """간단한 헬스 체크"""
    return {"status": "healthy"}


@router.get("/health-ui", response_class=HTMLResponse)
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
    except Exception:
        google_status = "❌ Unavailable"

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
                <h1>🔐 Privacy Service</h1>
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
