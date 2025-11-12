"""
RANDOM 파이프라인
의도: "아무데나 가고 싶어", "심심해", "뭐 할까" 등 무작위 추천
"""

import httpx
from typing import Optional

async def execute(service, query, classification, user_location, steps, session_token: Optional[str] = None):
    """
    RANDOM 파이프라인 실행

    Args:
        service: BeatyService 인스턴스
        query: 사용자 질의
        classification: 의도분류 결과
        user_location: 사용자 위치 (optional)
        steps: 실행 단계 리스트
        session_token: 세션 토큰 (optional)

    Returns:
        {
            "intent": "RANDOM",
            "steps": [...],
            "final_response": {
                "answer": "...",
                "poi": {...}
            }
        }
    """

    print(f"[RANDOM_PIPELINE] 시작: '{query}'")

    # Step 2: Random POI Service 호출
    try:
        # 쿼리 파라미터 구성
        params = {}
        if user_location:
            params["lat"] = user_location["lat"]
            params["lng"] = user_location["lng"]
            print(f"[RANDOM_PIPELINE] 사용자 위치 포함: {params}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://localhost:8006/api/random-poi",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            random_data = response.json()

        if not random_data.get("success") or not random_data.get("poi"):
            steps.append({
                "step": len(steps) + 1,
                "name": "랜덤 POI 조회 실패",
                "result": {"error": "POI를 찾을 수 없습니다"}
            })

            return {
                "intent": "RANDOM",
                "steps": steps,
                "final_response": {
                    "answer": "죄송해요, 추천할 장소를 찾지 못했어요.",
                    "poi": None
                }
            }

        poi_data = random_data["poi"]

        steps.append({
            "step": len(steps) + 1,
            "name": "랜덤 POI 조회",
            "result": {
                "title": poi_data["title"],
                "address": poi_data["addr1"]
            }
        })

        print(f"[RANDOM_PIPELINE] 선택된 POI: {poi_data['title']}")

        # Step 3: 최종 응답 (beaty_description은 이미 random-poi-service에서 생성됨)
        answer = poi_data.get("beaty_description", f"{poi_data['title']}을(를) 추천드려요!")

        steps.append({
            "step": len(steps) + 1,
            "name": "최종응답",
            "result": {
                "answer": answer,
                "poi": poi_data
            }
        })

        print(f"[RANDOM_PIPELINE] 응답 생성 완료")

        return {
            "intent": "RANDOM",
            "steps": steps,
            "final_response": {
                "answer": answer,
                "poi": poi_data
            }
        }

    except Exception as e:
        print(f"[RANDOM_PIPELINE] 오류: {e}")
        import traceback
        traceback.print_exc()

        steps.append({
            "step": len(steps) + 1,
            "name": "Random POI Service 호출 실패",
            "result": {"error": str(e)}
        })

        return {
            "intent": "RANDOM",
            "steps": steps,
            "final_response": {
                "answer": "죄송해요, 장소를 조회하는 중에 오류가 발생했어요.",
                "poi": None
            }
        }
