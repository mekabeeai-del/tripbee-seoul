"""
Gateway Service - Dynamic Proxy Router
"""

import httpx
from fastapi import Request, Response, HTTPException
from database import get_active_routes
from typing import Dict


# 라우트 캐시 (메모리)
ROUTE_CACHE: Dict[str, str] = {}


def load_routes_to_cache():
    """DB에서 라우트 로드하여 캐시에 저장"""
    global ROUTE_CACHE
    routes = get_active_routes()

    ROUTE_CACHE = {
        route['prefix']: route['target_url']
        for route in routes
    }

    print(f"[GATEWAY] Loaded {len(ROUTE_CACHE)} routes:")
    for prefix, target in ROUTE_CACHE.items():
        print(f"  {prefix} → {target}")


def reload_routes():
    """라우트 새로고침"""
    load_routes_to_cache()
    return {"success": True, "routes": len(ROUTE_CACHE)}


async def proxy_request(request: Request, path: str = ""):
    """
    동적 프록시 핸들러

    요청을 받아서 적절한 백엔드 서비스로 전달
    """
    # 요청 경로에서 prefix 찾기
    full_path = request.url.path
    target_url = None
    prefix_matched = None

    # 가장 긴 prefix부터 매칭 (더 구체적인 경로 우선)
    sorted_prefixes = sorted(ROUTE_CACHE.keys(), key=len, reverse=True)

    for prefix in sorted_prefixes:
        if full_path.startswith(prefix):
            target_url = ROUTE_CACHE[prefix]
            prefix_matched = prefix
            break

    if not target_url:
        raise HTTPException(status_code=404, detail=f"No route found for {full_path}")

    # prefix 제거한 나머지 경로
    remaining_path = full_path[len(prefix_matched):]

    # 백엔드 URL 구성
    backend_url = f"{target_url}{remaining_path}"

    # 쿼리 파라미터 추가
    if request.url.query:
        backend_url += f"?{request.url.query}"

    print(f"[PROXY] {request.method} {full_path} → {backend_url}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 요청 헤더 복사 (Host 제외)
            headers = dict(request.headers)
            headers.pop('host', None)

            # 백엔드로 요청 전달
            response = await client.request(
                method=request.method,
                url=backend_url,
                headers=headers,
                content=await request.body(),
                follow_redirects=False
            )

            # 응답 헤더 필터링
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            response_headers = {
                key: value
                for key, value in response.headers.items()
                if key.lower() not in excluded_headers
            }

            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Backend service timeout")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Cannot connect to {target_url}")
    except Exception as e:
        print(f"[PROXY ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
