"""
FIND_PLACE 파이프라인 - 장소 검색 의도 처리
"""
import httpx
from typing import Dict, Any, Optional, List
from openai import OpenAI


async def execute(
    service,
    query: str,
    classification: Dict[str, Any],
    user_location: Optional[Dict[str, float]] = None,
    steps: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    FIND_PLACE 파이프라인 통합 실행

    Args:
        service: BeatyService 인스턴스
        query: 원본 질의
        classification: 의도분류 결과
        user_location: 사용자 현재 위치 {lat, lng}
        steps: 이전 단계 결과 (ROUTE에서 전환 시)

    Returns:
        {
            "intent": "FIND_PLACE",
            "steps": [...],
            "final_response": {...}
        }
    """
    if steps is None:
        steps = []

    print(f"[FINDPLACE_PIPELINE] 시작: '{query}'")

    # 의도 전환 표시
    if any(step.get("result", {}).get("intent_changed") for step in steps):
        steps.append({
            "step": 3.5,
            "name": "의도 전환 (ROUTE → FIND_PLACE)",
            "result": {"reason": "geocoding_failed"}
        })

    try:
        # geocoding_failed로 전환되었는지 확인
        is_geocoding_failed = any(
            step.get("result", {}).get("reason") == "geocoding_failed"
            for step in steps
        )

        # Step 2: 쿼리 리라이트 (FIND_PLACE용)
        from .query_rewriter import FindPlaceQueryRewriter

        rewriter = FindPlaceQueryRewriter(service.config["openai_api_key"])

        category_text = classification.get("category_text")
        location_keyword = classification.get("location_keyword") or classification.get("destination_keyword")
        hard_constraints = classification.get("hard_constraints", [])
        emotion = classification.get("emotion")

        rewrite_result = rewriter.rewrite(
            original_query=query,
            category_text=category_text,
            location_keyword=location_keyword,
            hard_constraints=hard_constraints,
            emotion=emotion
        )

        steps.append({
            "step": 2,
            "name": "쿼리 리라이트 (FIND_PLACE)",
            "result": rewrite_result
        })
        print(f"[FINDPLACE_PIPELINE] Step 2 완료: {rewrite_result.get('search_keyword')}")

        # Step 3: Google Places 검색
        search_keyword = rewrite_result.get("search_keyword", query)
        filters = rewrite_result.get("filters", {})
        limit = rewrite_result.get("limit", 5)

        # 사용자 위치 기본값
        user_lat = user_location["lat"] if user_location else 37.5665
        user_lng = user_location["lng"] if user_location else 126.9780

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8003/api/find-place",
                json={
                    "keyword": search_keyword,
                    "user_lat": user_lat,
                    "user_lng": user_lng,
                    "limit": limit,
                    "language": "ko",
                    "filters": filters
                },
                timeout=10.0
            )
            response.raise_for_status()
            places_data = response.json()

        places = places_data.get("results", [])

        step3_result = {
            "query": search_keyword,
            "count": len(places),
            "places": places
        }
        steps.append({
            "step": 3,
            "name": "장소검색 (Google Places)",
            "result": step3_result
        })
        print(f"[FINDPLACE_PIPELINE] Step 3 완료: {len(places)}개 장소")

        # Step 4: 최종 응답 생성
        final_response = _generate_final_response(
            service,
            query,
            search_keyword,
            places,
            is_geocoding_failed=is_geocoding_failed,
            location_keyword=location_keyword
        )

        steps.append({
            "step": 4,
            "name": "최종응답",
            "result": final_response
        })
        print(f"[FINDPLACE_PIPELINE] Step 4 완료")

        return {
            "intent": "FIND_PLACE",
            "steps": steps,
            "final_response": final_response
        }

    except Exception as e:
        print(f"[FINDPLACE_PIPELINE] 오류: {e}")
        import traceback
        traceback.print_exc()

        steps.append({
            "step": "error",
            "name": "파이프라인 오류",
            "result": {"error": str(e)}
        })

        return {
            "intent": "FIND_PLACE",
            "steps": steps,
            "final_response": {
                "answer": f"죄송합니다. 장소 검색 중 오류가 발생했습니다: {str(e)}",
                "error": True
            }
        }


def _generate_final_response(
    service,
    original_query: str,
    search_keyword: str,
    places: List[Dict],
    is_geocoding_failed: bool = False,
    location_keyword: str = None
) -> Dict:
    """최종 응답 생성 - Beaty 캐릭터로 응답"""

    # Geocoding 실패로 전환된 경우 특별 처리
    if is_geocoding_failed:
        answer = f"앗! '{location_keyword}'까지 가는 경로를 찾으려 했는데, 정확한 위치를 특정하기 어려워요. 😅\n\n"
        answer += f"'{location_keyword}'가 조금 애매한 것 같아요. 지도에서 정확한 출발지나 도착지를 클릭해서 선택해주시면, "
        answer += f"더 정확한 경로를 안내해드릴 수 있어요!\n\n"

        if places:
            answer += f"대신 '{search_keyword}'에 대한 장소 {len(places)}개를 찾아봤어요. 혹시 이 중에 원하시는 곳이 있을까요?"

        return {
            "answer": answer,
            "places": places,
            "count": len(places),
            "geocoding_failed": True,
            "suggested_action": "지도에서 위치를 직접 선택해주세요"
        }

    if not places:
        context = f"""
사용자 질문: {original_query}
검색 키워드: {search_keyword}
결과: 장소를 찾을 수 없음
"""
        try:
            client = OpenAI(api_key=service.config["openai_api_key"])
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": service.character_prompt},
                    {"role": "user", "content": f"{context}\n\n위 정보를 바탕으로 주인님께 친절하게 답변해주세요."}
                ],
                temperature=0.7
            )
            answer = response.choices[0].message.content
        except Exception as e:
            print(f"[FINDPLACE_PIPELINE] OpenAI 호출 실패: {e}")
            answer = f"앗, '{search_keyword}'에 대한 검색 결과를 찾을 수 없었어요."

        return {
            "answer": answer,
            "places": [],
            "count": 0
        }

    # GPT로 자연스러운 응답 생성 (장소 리스트 제외)
    context = f"""
사용자 질문: {original_query}
검색 키워드: {search_keyword}
총 검색 결과: {len(places)}개

** 장소 이름을 나열하지 말고, "{len(places)}개 장소를 찾았다"는 내용으로 자연스럽게 응답해주세요.
** 사용자의 질문 의도에 맞춰 공감하며 짧게 답변해주세요.
"""

    try:
        client = OpenAI(api_key=service.config["openai_api_key"])
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": service.character_prompt},
                {"role": "user", "content": f"{context}\n\n위 정보를 바탕으로 주인님께 친절하고 짧게 답변해주세요. 장소 이름은 절대 나열하지 마세요."}
            ],
            temperature=0.7
        )
        answer = response.choices[0].message.content
    except Exception as e:
        print(f"[FINDPLACE_PIPELINE] OpenAI 호출 실패: {e}")
        answer = f"{len(places)}개 장소를 찾았어요!"

    return {
        "answer": answer,
        "places": places,
        "count": len(places),
        "search_keyword": search_keyword
    }
