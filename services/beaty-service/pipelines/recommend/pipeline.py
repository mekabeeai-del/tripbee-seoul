"""
RECOMMEND 파이프라인 - POI 추천 의도 처리
"""
import httpx
from typing import Dict, Any, Optional, List, AsyncGenerator
from openai import OpenAI
from .position_resolver import PositionResolver
import asyncpg
import sys
from pathlib import Path

# 상위 디렉토리의 orchestration 모듈 import
sys.path.append(str(Path(__file__).parent.parent.parent))
from orchestration.gpt_streaming import stream_gpt_response


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
    position_resolver = PositionResolver(service.config["openai_api_key"], service.config["db_config"])

    try:
        # Step 2: 위치 해결 (PositionResolver 사용)
        location_keyword = classification.get("location_keyword")
        geometry_id = None

        if location_keyword:
            position_result = await position_resolver.resolve(location_keyword)
            if position_result:
                step2_result = {
                    "location_keyword": location_keyword,
                    "resolved": {
                        "geometry_id": position_result["geometry_id"],
                        "name": position_result["name"]
                    }
                }
                geometry_id = position_result["geometry_id"]
            else:
                step2_result = {"location_keyword": location_keyword, "resolved": None}
        else:
            step2_result = {"skipped": True, "reason": "no_location"}

        steps.append({
            "step": 2,
            "name": "위치 해결",
            "result": step2_result
        })

        # Step 3: 쿼리 리라이트 (QueryRewriter 사용)
        from .query_rewriter import QueryRewriter

        # IntentClassifier에서 로드한 카테고리 목록 전달
        categories = service.intent_classifier.categories if hasattr(service.intent_classifier, 'categories') else ""
        rewriter = QueryRewriter(service.config["openai_api_key"], categories)

        rewrite_result = rewriter.rewrite(
            original_query=query,
            intent="RECOMMEND",
            category=None,
            geometry_id=geometry_id,
            user_location=user_location,
            hard_constraints=classification.get("hard_constraints", []),
            emotion=classification.get("emotion")
        )

        # Step 3 결과에 category_ids와 geometry_id 포함
        category_ids = rewrite_result.get("category_ids", [])
        step3_result = {
            "rewrite": rewrite_result,
            "category_ids": category_ids,
            "geometry_id": geometry_id,
            "user_location": user_location
        }
        steps.append({
            "step": 3,
            "name": "쿼리 리라이트",
            "result": step3_result
        })
        print(f"[RECOMMEND_PIPELINE] Step 3 완료: {rewrite_result.get('query_text')}")

        # Step 4: 추천 검색 (KTO LIKE 검색)
        # category_ids를 전달하면 RecommendService가 내부에서 순차 검색

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
            "category_ids": category_ids,  # 배열로 전달
            "geometry_id": geometry_id,
            "user_location": user_location,
            "filters": filters,
            "preferences": preferences,
            "core_keywords": core_keywords,
            "limit": 10,
            "min_poi_count": 5
        }

        print(f"[RECOMMEND_PIPELINE] KTO LIKE 검색 중...")
        print(f"  query_text: {request_data['query_text']}")
        print(f"  core_keywords: {request_data['core_keywords']}")
        print(f"  category_ids: {request_data['category_ids']}")
        print(f"  geometry_id: {request_data['geometry_id']}")

        pois = []
        keyword_matched_pois = []

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8001/api/recommend",
                    json=request_data,
                    timeout=30.0
                )
                response.raise_for_status()
                recommend_data = response.json()

            pois = recommend_data.get("results", [])

            # keyword_match_count > 0인 POI만 필터링
            keyword_matched_pois = [poi for poi in pois if poi.get('keyword_match_count', 0) > 0]

            print(f"[RECOMMEND_PIPELINE] KTO 검색 결과: 전체={len(pois)}개, 키워드매칭={len(keyword_matched_pois)}개")

        except Exception as e:
            print(f"[RECOMMEND_PIPELINE] KTO 검색 실패: {e}")

        # Step 4-1: Vector 유사도 검색으로 대안 추천
        if len(keyword_matched_pois) == 0:
            print(f"[RECOMMEND_PIPELINE] 키워드 매칭 결과 없음 → Vector 유사도로 대안 검색")

            # category_text 생성 (Vector 검색용)
            category_text = rewrite_result.get("query_text", query)
            if not category_text:
                category_text = query

            print(f"[RECOMMEND_PIPELINE] Vector 검색 입력: category_text='{category_text}'")

            # 카테고리가 있으면 해당 카테고리 내에서 Vector 검색
            similar_pois = []
            try:
                print(f"[RECOMMEND_PIPELINE] Vector 검색 시작...")
                if category_text:
                    # 카테고리 Vector 검색 (유사한 카테고리 POI)
                    import asyncpg
                    import ssl
                    ssl_context = ssl.create_default_context()
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE

                    conn = await asyncpg.connect(
                        host=service.db_config["host"],
                        port=service.db_config["port"],
                        database=service.db_config["database"],
                        user=service.db_config["user"],
                        password=service.db_config["password"],
                        ssl=ssl_context
                    )

                    # 카테고리 임베딩 가져오기
                    print(f"[RECOMMEND_PIPELINE] OpenAI 임베딩 생성 중...")
                    from openai import OpenAI
                    openai_client = OpenAI(api_key=service.config["openai_api_key"])
                    embedding_response = openai_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=category_text
                    )
                    query_embedding = embedding_response.data[0].embedding
                    print(f"[RECOMMEND_PIPELINE] 임베딩 생성 완료: {len(query_embedding)}차원")

                    # vector를 PostgreSQL 문자열 형식으로 변환: "[0.1, 0.2, ...]"
                    embedding_str = str(query_embedding)

                    # geometry 정보 조회 (위치 필터링용)
                    geometry_info = None
                    if geometry_id:
                        geom_query = """
                            SELECT geometry_id, geom_type, ST_AsGeoJSON(geom) as geojson
                            FROM mkb_master_position_geometry
                            WHERE geometry_id = $1
                        """
                        geom_row = await conn.fetchrow(geom_query, geometry_id)
                        if geom_row:
                            import json
                            geometry_info = {
                                "geometry_id": geom_row["geometry_id"],
                                "geom_type": geom_row["geom_type"],
                                "geojson": json.loads(geom_row["geojson"])
                            }
                            print(f"[RECOMMEND_PIPELINE] Geometry 정보 로드: type={geometry_info['geom_type']}")

                    # 유사한 카테고리의 POI 검색
                    vector_query = """
                        SELECT DISTINCT
                            t.content_id,
                            t.title,
                            t.mapx,
                            t.mapy,
                            t.addr1,
                            t.cat1,
                            t.cat2,
                            t.cat3,
                            t.content_type_id,
                            t.first_image,
                            t.overview,
                            1 - (c.embedding <=> $1::vector) AS similarity
                        FROM kto_tour_base_list t
                        JOIN kto_tour_category c ON (
                            t.cat1 = c.cat_code OR
                            t.cat2 = c.cat_code OR
                            t.cat3 = c.cat_code
                        )
                        WHERE c.lang = 'ko'
                          AND t.language = 'Kor'
                          AND t.mapx IS NOT NULL
                          AND t.mapy IS NOT NULL
                    """

                    # Geometry 필터 추가
                    params = [embedding_str]  # 문자열로 변환된 임베딩 사용
                    param_idx = 2

                    if geometry_info:
                        geom_type = geometry_info["geom_type"].upper()
                        geojson_str = json.dumps(geometry_info["geojson"])

                        if geom_type in ['POLYGON', 'MULTIPOLYGON']:
                            # POLYGON: Intersects
                            vector_query += f" AND ST_Intersects(t.location, ST_GeomFromGeoJSON(${param_idx}))"
                            params.append(geojson_str)
                        else:
                            # POINT: 1500m 반경
                            vector_query += f" AND ST_DWithin(t.location::geography, ST_GeomFromGeoJSON(${param_idx})::geography, 1500)"
                            params.append(geojson_str)
                        print(f"[RECOMMEND_PIPELINE] Geometry 필터 적용: {geom_type}")

                    print(f"[RECOMMEND_PIPELINE] Vector SQL 실행 중...")
                    rows = await conn.fetch(vector_query + " ORDER BY similarity DESC LIMIT 10", *params)

                    print(f"[RECOMMEND_PIPELINE] SQL 실행 완료: {len(rows)}개 row")

                    for row in rows:
                        similar_pois.append({
                            "content_id": str(row["content_id"]),
                            "title": row["title"],
                            "mapx": float(row["mapx"]) if row["mapx"] else 0,
                            "mapy": float(row["mapy"]) if row["mapy"] else 0,
                            "addr1": row["addr1"],
                            "cat1": row["cat1"],
                            "cat2": row["cat2"],
                            "cat3": row["cat3"],
                            "content_type_id": str(row["content_type_id"]),
                            "first_image": row["first_image"],
                            "overview": row["overview"],
                            "similarity": float(row["similarity"])
                        })

                    await conn.close()
                    print(f"[RECOMMEND_PIPELINE] Vector 유사도 검색 결과: {len(similar_pois)}개")

            except Exception as e:
                print(f"[RECOMMEND_PIPELINE] Vector 검색 실패: {e}")

            steps.append({
                "step": 4,
                "name": "KTO 검색 (키워드 매칭 없음, Vector 유사도 대안)",
                "result": {"count": len(similar_pois), "pois": similar_pois}
            })

            # 대안 POI로 최종 응답 생성 (구글 검색 제안 포함)
            final_response = _generate_alternative_response(service, query, category_text, similar_pois, location_keyword)

            steps.append({
                "step": 5,
                "name": "최종응답 (대안 추천)",
                "result": final_response
            })

            return {
                "intent": "RECOMMEND",
                "steps": steps,
                "final_response": final_response
            }

        # KTO 키워드 매칭 결과가 있으면 그대로 진행
        pois = keyword_matched_pois
        step4_result = {
            "count": len(pois),
            "pois": pois
        }
        steps.append({
            "step": 4,
            "name": "KTO 추천검색",
            "result": step4_result
        })
        print(f"[RECOMMEND_PIPELINE] Step 4 완료: {len(pois)}개 POI")

        # Step 5: 최종 응답 생성
        final_response = _generate_final_response(service, query, pois)

        # 스트리밍 응답 추가
        if "answer" in final_response and final_response["answer"]:
            # answer를 재생성하기 위한 컨텍스트 구성
            from orchestration.response_generator import create_streaming_response

            context = f"""
사용자 질문: {query}
추천 결과: {len(pois)}개의 장소

** 응답 가이드:
1. "비티만의 추천이에요!" 문구를 포함해서 답변 시작
2. 검색 결과를 친근하게 소개
3. 장소 이름은 나열하지 않기
4. 짧고 자연스럽게 답변하기
"""
            final_response["answer_stream"] = create_streaming_response(
                service,
                context,
                "위 정보를 바탕으로 주인님께 친절하고 짧게 답변해주세요. 장소 이름은 절대 나열하지 마세요."
            )

        steps.append({
            "step": 5,
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


def _generate_google_fallback_response(service, query: str, places: List[Dict]) -> Dict:
    """Google Places 폴백 최종 응답 생성 - Beaty 캐릭터로 응답"""

    if not places:
        context = f"""
사용자 질문: {query}
결과: Google Places에서도 장소를 찾을 수 없음
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
            answer = f"앗, '{query}'에 대한 결과를 찾을 수 없었어요."

        return {
            "answer": answer,
            "places": [],
            "count": 0
        }

    # Google Places 결과가 있을 때
    context = f"""
사용자 질문: {query}
상황: 제가 가진 관광 정보에는 해당하는 장소가 없어서, 대신 구글에서 검색해드렸어요.
Google Places 검색 결과: {len(places)}개

** 응답 가이드:
1. "제가 가진 정보에는 추천드릴 [카테고리]가 없어요"라고 먼저 말하기
2. "대신 구글에서 검색해서 {len(places)}개 장소를 찾았어요!" 라고 이어서 말하기
3. 장소 이름은 절대 나열하지 말기
4. 친근하고 자연스럽게 답변하기
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
        answer = f"{len(places)}개 장소를 찾았어요!"

    return {
        "answer": answer,
        "places": places,
        "count": len(places)
    }


def _generate_final_response(service, query: str, pois: List[Dict]) -> Dict:
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

    # Beaty 설명 추가
    for poi in selected_pois:
        if 'beaty_description' not in poi:
            poi["beaty_description"] = _generate_beaty_description(service, poi)

    # 컨텍스트 구성 (장소 리스트 제외, 개수만 전달)
    if match_type == "keyword":
        context = f"""
사용자 질문: {query}
키워드 매칭된 추천 장소: {len(selected_pois)}개

** 위 장소들은 사용자가 요청한 핵심 키워드와 정확히 일치하는 곳입니다.
** 장소 이름을 나열하지 말고, "{len(selected_pois)}개 장소를 찾았다"는 내용으로 자연스럽게 응답해주세요.
"""
    else:
        context = f"""
사용자 질문: {query}
추천 장소: {len(selected_pois)}개

** 사용자가 요청한 내용과 관련된 장소를 추천드립니다.
** 장소 이름을 나열하지 말고, "{len(selected_pois)}개 장소를 찾았다"는 내용으로 자연스럽게 응답해주세요.
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
            answer = f"{len(selected_pois)}개 장소를 추천드릴게요!"

    return {
        "answer": answer,
        "pois": selected_pois,  # 필터링된 POI만 반환
        "count": len(selected_pois),
        "match_type": match_type,
        "total_pois": len(pois)
    }


def _generate_beaty_description(service, poi: Dict) -> str:
    """POI에 대한 Beaty 캐릭터 스타일 설명 생성"""
    try:
        context = f"""
POI 정보:
- 이름: {poi.get('title', '알 수 없음')}
- 주소: {poi.get('addr1', '알 수 없음')}
- 개요: {poi.get('overview', '')[:200] if poi.get('overview') else '정보 없음'}

위 POI에 대해 1-2문장으로 귀엽고 간결하게 소개해주세요.
"""
        client = OpenAI(api_key=service.config["openai_api_key"])
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": service.character_prompt},
                {"role": "user", "content": context}
            ],
            temperature=0.7,
            max_tokens=100
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[RECOMMEND_PIPELINE] Beaty 설명 생성 실패: {e}")
        return f"{poi.get('title', '이곳')}은(는) 추천드리는 장소예요!"


def _generate_alternative_response(service, query: str, category_text: str, similar_pois: List[Dict], location_keyword: str = None) -> Dict:
    """키워드 매칭 실패 시 Vector 유사도 검색 결과로 대안 응답 생성"""

    # Beaty 설명 추가
    for poi in similar_pois:
        poi["beaty_description"] = _generate_beaty_description(service, poi)

    location_text = f"{location_keyword}의 " if location_keyword else ""
    category_display = category_text if category_text else "해당 종류"

    context = f"""
주인님께서 '{query}'라고 물어보셨어요.

정확히 일치하는 {location_text}'{category_display}'는 비트맵에 없네요 ㅠㅠ
하지만 비슷한 장소 {len(similar_pois)}개를 찾았어요!

주인님께 이렇게 말씀드려주세요:
- 제가 알고 있는 {location_text}'{category_display}'는 없다고 귀엽고 솔직하게 알려드리고 (ㅠㅠ 이런 느낌으로!)
- 대신 비슷한 곳들을 추천해드린다고 밝게 말씀드리고
- 마지막으로 구글에서 검색해드릴까요? 라고 물어봐주세요

장소 이름은 나열하지 말고, 짧고 귀엽게 2-3문장으로 말해주세요.
"""

    try:
        client = OpenAI(api_key=service.config["openai_api_key"])
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": service.character_prompt},
                {"role": "user", "content": context}
            ],
            temperature=0.7
        )
        answer = response.choices[0].message.content
    except Exception as e:
        print(f"[RECOMMEND_PIPELINE] OpenAI 호출 실패: {e}")
        answer = f"제가 알고 있는 {location_text}{category_display}는 없네요 ㅠㅠ 대신 비슷한 곳들을 추천해드릴게요! 아니면 구글에서 검색해드릴까요?"

    return {
        "answer": answer,
        "pois": similar_pois,
        "count": len(similar_pois),
        "is_alternative": True,  # 대안 추천임을 표시
        "suggest_google_search": True,  # 구글 검색 제안
        "original_query": query
    }
