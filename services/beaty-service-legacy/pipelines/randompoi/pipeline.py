"""
RANDOM 파이프라인
의도: "아무데나 가고 싶어", "심심해", "뭐 할까" 등 무작위 추천
"""

import httpx
from typing import Optional
import sys
from pathlib import Path

# 상위 디렉토리의 orchestration 모듈 import
sys.path.append(str(Path(__file__).parent.parent.parent))
from orchestration.response_generator import create_streaming_response

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
                "http://localhost:8001/api/random",
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

        # 스트리밍 응답 추가
        context = f"""
사용자 질문: {query}
랜덤 추천 POI: {poi_data['title']}
주소: {poi_data.get('addr1', '주소 정보 없음')}

** 응답 가이드:
1. 랜덤 추천을 친근하게 소개
2. 장소의 매력을 짧게 설명
3. 자연스럽고 친근하게
"""
        answer_stream = create_streaming_response(
            service,
            context,
            "위 정보를 바탕으로 주인님께 랜덤 추천 장소를 친근하고 짧게 소개해주세요."
        )

        return {
            "intent": "RANDOM",
            "steps": steps,
            "final_response": {
                "answer": answer,
                "answer_stream": answer_stream,
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
