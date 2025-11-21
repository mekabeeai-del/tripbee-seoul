"""
Gateway Service - Admin UI & Management
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from models import RouteCreate, RouteUpdate, RouteResponse
from database import get_db_connection
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/routes", response_model=List[RouteResponse])
async def list_routes():
    """모든 라우트 목록 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, service_name, target_url, prefix, swagger_url, is_active
        FROM gateway_routes
        ORDER BY prefix
    """)

    routes = cursor.fetchall()
    cursor.close()
    conn.close()

    return [dict(r) for r in routes]


@router.post("/routes", response_model=RouteResponse)
async def create_route(route: RouteCreate):
    """새 라우트 추가"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url)
            VALUES (%s, %s, %s, %s)
            RETURNING id, service_name, target_url, prefix, swagger_url, is_active
        """, (route.service_name, route.target_url, route.prefix, route.swagger_url))

        new_route = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return dict(new_route)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/routes/{route_id}", response_model=RouteResponse)
async def update_route(route_id: int, route: RouteUpdate):
    """라우트 수정"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 업데이트할 필드만 추출
    updates = []
    values = []

    if route.service_name is not None:
        updates.append("service_name = %s")
        values.append(route.service_name)
    if route.target_url is not None:
        updates.append("target_url = %s")
        values.append(route.target_url)
    if route.prefix is not None:
        updates.append("prefix = %s")
        values.append(route.prefix)
    if route.swagger_url is not None:
        updates.append("swagger_url = %s")
        values.append(route.swagger_url)
    if route.is_active is not None:
        updates.append("is_active = %s")
        values.append(route.is_active)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = NOW()")
    values.append(route_id)

    cursor.execute(f"""
        UPDATE gateway_routes
        SET {', '.join(updates)}
        WHERE id = %s
        RETURNING id, service_name, target_url, prefix, swagger_url, is_active
    """, values)

    updated_route = cursor.fetchone()

    if not updated_route:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Route not found")

    conn.commit()
    cursor.close()
    conn.close()

    return dict(updated_route)


@router.delete("/routes/{route_id}")
async def delete_route(route_id: int):
    """라우트 삭제"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM gateway_routes WHERE id = %s RETURNING id", (route_id,))
    deleted = cursor.fetchone()

    if not deleted:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Route not found")

    conn.commit()
    cursor.close()
    conn.close()

    return {"success": True, "message": "Route deleted"}


@router.get("/ui", response_class=HTMLResponse)
async def admin_ui():
    """Admin Dashboard UI"""
    html_content = """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gateway Admin Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
                min-height: 100vh;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
            }

            .header {
                text-align: center;
                color: white;
                margin-bottom: 40px;
            }

            .header h1 {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 10px;
            }

            .content {
                background: white;
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }

            .add-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin-bottom: 20px;
            }

            .add-btn:hover {
                background: #5568d3;
            }

            .route-list {
                display: grid;
                gap: 15px;
            }

            .route-card {
                border: 2px solid #eee;
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s;
            }

            .route-card:hover {
                border-color: #667eea;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            }

            .route-card.inactive {
                opacity: 0.5;
            }

            .route-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .route-name {
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }

            .route-status {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
            }

            .status-active {
                background: #d4edda;
                color: #155724;
            }

            .status-inactive {
                background: #f8d7da;
                color: #721c24;
            }

            .route-info {
                display: grid;
                gap: 8px;
                margin-bottom: 15px;
            }

            .route-info-item {
                font-size: 14px;
                color: #666;
            }

            .route-info-item strong {
                color: #333;
                margin-right: 8px;
            }

            .route-actions {
                display: flex;
                gap: 10px;
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
            }

            .btn-swagger {
                background: #49cc90;
                color: white;
            }

            .btn-edit {
                background: #ffc107;
                color: white;
            }

            .btn-delete {
                background: #dc3545;
                color: white;
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
            }

            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
            }

            .modal.show {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
            }

            .form-group input {
                width: 100%;
                padding: 10px;
                border: 2px solid #eee;
                border-radius: 8px;
                font-size: 14px;
            }

            .form-group input:focus {
                outline: none;
                border-color: #667eea;
            }

            .form-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .btn-primary {
                background: #667eea;
                color: white;
            }

            .btn-secondary {
                background: #6c757d;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌐 Gateway Admin Dashboard</h1>
                <p>API 라우팅 관리</p>
            </div>

            <div class="content">
                <button class="add-btn" onclick="showAddModal()">➕ 새 서비스 추가</button>

                <div class="route-list" id="routeList">
                    <!-- 동적으로 채워짐 -->
                </div>
            </div>
        </div>

        <!-- Add/Edit Modal -->
        <div class="modal" id="routeModal">
            <div class="modal-content">
                <h2 id="modalTitle">새 서비스 추가</h2>
                <form id="routeForm">
                    <input type="hidden" id="routeId">

                    <div class="form-group">
                        <label>서비스 이름</label>
                        <input type="text" id="serviceName" placeholder="Privacy Service" required>
                    </div>

                    <div class="form-group">
                        <label>Target URL</label>
                        <input type="url" id="targetUrl" placeholder="http://localhost:8100" required>
                    </div>

                    <div class="form-group">
                        <label>Prefix</label>
                        <input type="text" id="prefix" placeholder="/api/auth" required>
                    </div>

                    <div class="form-group">
                        <label>Swagger URL</label>
                        <input type="text" id="swaggerUrl" placeholder="/docs" value="/docs">
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="hideModal()">취소</button>
                        <button type="submit" class="btn btn-primary">저장</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            // 라우트 목록 로드
            async function loadRoutes() {
                const response = await fetch('/admin/routes');
                const routes = await response.json();

                const listHtml = routes.map(route => `
                    <div class="route-card ${!route.is_active ? 'inactive' : ''}">
                        <div class="route-header">
                            <div class="route-name">${route.service_name}</div>
                            <div class="route-status ${route.is_active ? 'status-active' : 'status-inactive'}">
                                ${route.is_active ? '✅ Active' : '❌ Inactive'}
                            </div>
                        </div>
                        <div class="route-info">
                            <div class="route-info-item">
                                <strong>Target:</strong> ${route.target_url}
                            </div>
                            <div class="route-info-item">
                                <strong>Prefix:</strong> ${route.prefix}
                            </div>
                            <div class="route-info-item">
                                <strong>Swagger:</strong> ${route.swagger_url || 'N/A'}
                            </div>
                        </div>
                        <div class="route-actions">
                            <button class="btn btn-swagger" onclick="openSwagger('${route.target_url}${route.swagger_url}')">
                                📖 Swagger
                            </button>
                            <button class="btn btn-edit" onclick="editRoute(${route.id})">
                                ✏️ 수정
                            </button>
                            <button class="btn btn-delete" onclick="deleteRoute(${route.id})">
                                🗑️ 삭제
                            </button>
                        </div>
                    </div>
                `).join('');

                document.getElementById('routeList').innerHTML = listHtml || '<p>등록된 서비스가 없습니다.</p>';
            }

            // 모달 표시
            function showAddModal() {
                document.getElementById('modalTitle').textContent = '새 서비스 추가';
                document.getElementById('routeForm').reset();
                document.getElementById('routeId').value = '';
                document.getElementById('routeModal').classList.add('show');
            }

            function hideModal() {
                document.getElementById('routeModal').classList.remove('show');
            }

            // 서비스 추가/수정
            document.getElementById('routeForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const routeId = document.getElementById('routeId').value;
                const data = {
                    service_name: document.getElementById('serviceName').value,
                    target_url: document.getElementById('targetUrl').value,
                    prefix: document.getElementById('prefix').value,
                    swagger_url: document.getElementById('swaggerUrl').value
                };

                const url = routeId ? `/admin/routes/${routeId}` : '/admin/routes';
                const method = routeId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    hideModal();
                    loadRoutes();
                    alert('저장되었습니다!');
                } else {
                    const error = await response.json();
                    alert('오류: ' + error.detail);
                }
            });

            // 수정
            async function editRoute(id) {
                const response = await fetch('/admin/routes');
                const routes = await response.json();
                const route = routes.find(r => r.id === id);

                document.getElementById('modalTitle').textContent = '서비스 수정';
                document.getElementById('routeId').value = route.id;
                document.getElementById('serviceName').value = route.service_name;
                document.getElementById('targetUrl').value = route.target_url;
                document.getElementById('prefix').value = route.prefix;
                document.getElementById('swaggerUrl').value = route.swagger_url || '';
                document.getElementById('routeModal').classList.add('show');
            }

            // 삭제
            async function deleteRoute(id) {
                if (!confirm('정말 삭제하시겠습니까?')) return;

                const response = await fetch(`/admin/routes/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    loadRoutes();
                    alert('삭제되었습니다!');
                }
            }

            // Swagger 열기
            function openSwagger(url) {
                window.open(url, '_blank');
            }

            // 초기 로드
            loadRoutes();
        </script>
    </body>
    </html>
    """

    return html_content
