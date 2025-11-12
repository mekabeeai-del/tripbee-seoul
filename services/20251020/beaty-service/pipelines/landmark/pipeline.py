"""
LANDMARK 파이프라인
의도: "서울에서 꼭 가봐야 할 곳"
"""

import httpx
from openai import OpenAI

LANDMARK_SERVICE_URL = "http://localhost:8005"

async def execute(service, query, classification, user_location, steps):
    """
    LANDMARK 파이프라인 실행

    Args:
        service: BeatyService 인스턴스
        query: 사용자 질의
        classification: 의도분류 결과
        user_location: 사용자 위치 (optional)
        steps: 실행 단계 리스트

    Returns:
        {
            "intent": "LANDMARK",
            "steps": [...],
            "final_response": {
                "answer": "...",
                "landmarks": [...]
            }
        }
    """

    # Step 2: 위치 키워드 추출
    location_keyword = classification.get("location_keyword") or "서울"

    steps.append({
        "step": len(steps) + 1,
        "name": "위치 키워드 추출",
        "result": {
            "location_keyword": location_keyword
        }
    })

    print(f"[LANDMARK] location_keyword: {location_keyword}")

    # Step 3: landmark-service 호출
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LANDMARK_SERVICE_URL}/api/landmark",
                json={
                    "location_keyword": location_keyword,
                    "limit": 10
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(f"landmark-service 오류: {response.status_code}")

            landmark_data = response.json()
            landmarks = landmark_data.get("landmarks", [])

            steps.append({
                "step": len(steps) + 1,
                "name": "랜드마크 조회",
                "result": {
                    "count": len(landmarks),
                    "landmarks": landmarks[:3]  # 처음 3개만 steps에 포함
                }
            })

            print(f"[LANDMARK] 조회 완료: {len(landmarks)}개")

    except Exception as e:
        print(f"[LANDMARK] 오류: {e}")
        steps.append({
            "step": len(steps) + 1,
            "name": "랜드마크 조회 실패",
            "result": {"error": str(e)}
        })

        # 실패 응답
        return {
            "intent": "LANDMARK",
            "steps": steps,
            "final_response": {
                "answer": f"죄송해요, {location_keyword}의 랜드마크 정보를 가져오는 데 실패했어요.",
                "landmarks": []
            }
        }

    # Step 4: 최종응답 (간단한 메시지 + 랜드마크 데이터)
    answer = f"{location_keyword}에서 꼭 가봐야 할 곳들이에요! 총 {len(landmarks)}곳을 추천드려요."

    steps.append({
        "step": len(steps) + 1,
        "name": "최종응답",
        "result": {
            "answer": answer,
            "location": location_keyword,
            "count": len(landmarks),
            "landmarks": landmarks
        }
    })

    print(f"[LANDMARK] 응답 생성 완료")

    # 최종 결과 반환
    return {
        "intent": "LANDMARK",
        "steps": steps,
        "final_response": {
            "answer": answer,
            "location": location_keyword,
            "count": len(landmarks),
            "landmarks": landmarks
        }
    }
