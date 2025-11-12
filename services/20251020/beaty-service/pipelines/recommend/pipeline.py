"""
RECOMMEND 파이프라인 - POI 추천 의도 처리
"""
import httpx
from typing import Dict, Any, Optional, List
from openai import OpenAI
from .category_resolver import CategoryResolver
from .position_resolver import PositionResolver


async def execute(
    service,
    query: str,
    classification: Dict[str, Any],
    user_location: Optional[Dict[str, float]] = None,
    steps: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    RECOMMEND 파이프라인 통합 실행

    Returns:
        {
            "intent": "RECOMMEND",
            "steps": [...],
            "final_response": {...}
        }
    """
    if steps is None:
        steps = []

    print(f"[RECOMMEND_PIPELINE] 시작: '{query}'")

    # Resolver 초기화 (이 파이프라인에서만 사용)
    category_resolver = CategoryResolver(service.config["openai_api_key"], service.config["db_config"])
    position_resolver = PositionResolver(service.config["openai_api_key"], service.config["db_config"])

    try:
        # Step 2: 카테고리 해결 (CategoryResolver 사용)
        category_text = classification.get("category_text")
        category = None
        category_result = None  # Step 4에서 사용할 변수 초기화

        if category_text:
            category_result = await category_resolver.resolve(category_text)
            if category_result:
                step2_result = {
                    "category_text": category_text,
                    "resolved": {
                        "cat_code": category_result["cat_code"],
                        "cat_level": category_result["cat_level"],
                        "content_type_id": category_result["content_type_id"],
                        "name": category_result["name"]
                    }
                }
                # recommend-service에 전달할 CategoryInfo 형식
                category = {
                    "cat_code": category_result["cat_code"],
                    "cat_level": category_result["cat_level"],
                    "content_type_id": str(category_result["content_type_id"])  # 문자열 변환
                }
            else:
                step2_result = {"category_text": category_text, "resolved": None}
        else:
            step2_result = {"skipped": True, "reason": "no_category"}

        steps.append({
            "step": 2,
            "name": "카테고리 해결",
            "result": step2_result
        })

        # Step 3: 위치 해결 (PositionResolver 사용)
        location_keyword = classification.get("location_keyword")
        geometry_id = None

        if location_keyword:
            position_result = await position_resolver.resolve(location_keyword)
            if position_result:
                step3_result = {
                    "location_keyword": location_keyword,
                    "resolved": {
                        "geometry_id": position_result["geometry_id"],
                        "name": position_result["name"]
                    }
                }
                geometry_id = position_result["geometry_id"]
            else:
                step3_result = {"location_keyword": location_keyword, "resolved": None}
        else:
            step3_result = {"skipped": True, "reason": "no_location"}

        steps.append({
            "step": 3,
            "name": "위치 해결",
            "result": step3_result
        })

        # Step 4: 쿼리 리라이트 (QueryRewriter 사용)
        from .query_rewriter import QueryRewriter

        rewriter = QueryRewriter(service.config["openai_api_key"])

        rewrite_result = rewriter.rewrite(
            original_query=query,
            intent="RECOMMEND",
            category=category_result if category_text and category_result else None,
            geometry_id=geometry_id,
            user_location=user_location,
            hard_constraints=classification.get("hard_constraints", []),
            emotion=classification.get("emotion")
        )

        # Step 4 결과에 category와 geometry_id 포함 (최종 request_data 미리보기)
        step4_result = {
            "rewrite": rewrite_result,
            "category": category,
            "geometry_id": geometry_id,
            "user_location": user_location
        }
        steps.append({
            "step": 4,
            "name": "쿼리 리라이트",
            "result": step4_result
        })
        print(f"[RECOMMEND_PIPELINE] Step 4 완료: {rewrite_result.get('query_text')}")

        # Step 5: 추천 검색 (recommend-service 호출)
        # QueryRewriter 결과 사용

        # 빈 객체를 null로 변환
        filters = rewrite_result.get("filters")
        if filters and len(filters) == 0:
            filters = None

        preferences = rewrite_result.get("preferences")
        if preferences and len(preferences) == 0:
            preferences = None

        core_keywords = rewrite_result.get("core_keywords")
        if core_keywords and len(core_keywords) == 0:
            core_keywords = None

        request_data = {
            "query_text": rewrite_result.get("query_text", query),
            "category": category,  # CategoryInfo 형식으로 전달
            "geometry_id": geometry_id,  # 정수 ID로 전달
            "user_location": user_location,
            "filters": filters,
            "preferences": preferences,
            "core_keywords": core_keywords,
            "limit": 10
        }

        print(f"[RECOMMEND_PIPELINE] Request to recommend-service:")
        print(f"  query_text: {request_data['query_text']}")
        print(f"  category: {request_data['category']}")
        print(f"  geometry_id: {request_data['geometry_id']}")
        print(f"  filters: {request_data['filters']}")
        print(f"  preferences: {request_data['preferences']}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8001/api/recommend",
                json=request_data,
                timeout=30.0
            )
            response.raise_for_status()
            recommend_data = response.json()

        pois = recommend_data.get("results", [])

        step5_result = {
            "count": len(pois),
            "pois": pois  # 전체 POI 표시 (content_type_id, cat3 등 카테고리 정보 포함)
        }
        steps.append({
            "step": 5,
            "name": "추천검색",
            "result": step5_result
        })
        print(f"[RECOMMEND_PIPELINE] Step 5 완료: {len(pois)}개 POI")

        # Step 6: 최종 응답 생성
        category_name = category_result.get("name") if category_result else None
        final_response = _generate_final_response(service, query, pois, category_name)

        steps.append({
            "step": 6,
            "name": "최종응답",
            "result": final_response
        })

        return {
            "intent": "RECOMMEND",
            "steps": steps,
            "final_response": final_response
        }

    except Exception as e:
        print(f"[RECOMMEND_PIPELINE] 오류: {e}")
        import traceback
        traceback.print_exc()

        steps.append({
            "step": "error",
            "name": "파이프라인 오류",
            "result": {"error": str(e)}
        })

        return {
            "intent": "RECOMMEND",
            "steps": steps,
            "final_response": {
                "answer": f"죄송합니다. 추천 검색 중 오류가 발생했습니다: {str(e)}",
                "error": True
            }
        }


def _generate_final_response(service, query: str, pois: List[Dict], category_name: str = None) -> Dict:
    """최종 응답 생성 - Beaty 캐릭터로 응답"""

    if not pois:
        context = f"""
사용자 질문: {query}
결과: 추천할 장소를 찾을 수 없음
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
            print(f"[RECOMMEND_PIPELINE] OpenAI 호출 실패: {e}")
            answer = f"앗, '{query}'에 대한 추천 결과를 찾을 수 없었어요."

        return {
            "answer": answer,
            "pois": [],
            "count": 0
        }

    # keyword_match_count > 0인 POI만 필터링
    keyword_matched_pois = [poi for poi in pois if poi.get('keyword_match_count', 0) > 0]

    # 키워드 매칭된 POI가 있으면 그것만 사용
    if keyword_matched_pois:
        selected_pois = keyword_matched_pois
        match_type = "keyword"
    else:
        selected_pois = pois
        match_type = "category"

    # 컨텍스트 구성 (장소 리스트 제외, 개수만 전달)
    if match_type == "keyword":
        context = f"""
사용자 질문: {query}
키워드 매칭된 추천 장소: {len(selected_pois)}개

** 위 장소들은 사용자가 요청한 핵심 키워드와 정확히 일치하는 곳입니다.
** 장소 이름을 나열하지 말고, "{len(selected_pois)}개 장소를 찾았다"는 내용으로 자연스럽게 응답해주세요.
"""
    else:
        category_label = category_name if category_name else "해당 카테고리"
        context = f"""
사용자 질문: {query}
추천 장소: {len(selected_pois)}개

** 사용자가 요청한 구체적인 키워드와 정확히 일치하는 곳은 찾지 못했습니다.
** 대신 "{category_label}"에 해당하는 장소를 추천드립니다.
** 장소 이름을 나열하지 말고, "대신 {category_label}에 해당하는 장소 {len(selected_pois)}개를 추천드린다"는 내용으로 자연스럽게 응답해주세요.
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
        print(f"[RECOMMEND_PIPELINE] OpenAI 호출 실패: {e}")
        if match_type == "keyword":
            answer = f"{len(selected_pois)}개 장소를 찾았어요!"
        else:
            category_label = category_name if category_name else "해당 카테고리"
            answer = f"대신 {category_label}에 해당하는 장소 {len(selected_pois)}개를 추천드릴게요!"

    return {
        "answer": answer,
        "pois": selected_pois,  # 필터링된 POI만 반환
        "count": len(selected_pois),
        "match_type": match_type,
        "total_pois": len(pois)
    }
