"""
ROUTE 파이프라인 - 경로 검색 의도 처리
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
    ROUTE 파이프라인 통합 실행

    Args:
        service: BeatyService 인스턴스
        query: 원본 질의
        classification: 의도분류 결과
        user_location: 사용자 현재 위치 {lat, lng}
        steps: 이전 단계 결과 (의도 전환 시)

    Returns:
        {
            "intent": "ROUTE",
            "steps": [...],  # 각 단계별 결과
            "final_response": {...}  # 최종 응답
        }
    """
    if steps is None:
        steps = []

    print(f"[ROUTE_PIPELINE] 시작: '{query}'")

    try:
        # Step 2: 출발지/도착지 추출 (classification에 이미 포함)
        origin_keyword = classification.get("origin_keyword")
        destination_keyword = classification.get("destination_keyword")

        step2_result = {
            "origin_keyword": origin_keyword,
            "destination_keyword": destination_keyword
        }
        steps.append({
            "step": 2,
            "name": "출발지/도착지 추출",
            "result": step2_result
        })
        print(f"[ROUTE_PIPELINE] Step 2 완료: {destination_keyword}")

        # Step 3: 좌표 변환 (Geocoding)
        origin_coords = None
        origin_name = None
        dest_coords = None
        dest_name = None

        # 출발지 처리
        if origin_keyword:
            origin_result = await service.google_geocoder.geocode(origin_keyword)
            if origin_result:
                origin_coords = {"lat": origin_result["lat"], "lng": origin_result["lng"]}
                origin_name = origin_result["formatted_address"]
            elif user_location:
                # Geocoding 실패 시 현재 위치 사용
                print(f"[ROUTE_PIPELINE] 출발지 '{origin_keyword}' geocoding 실패, 현재 위치 사용")
                origin_coords = user_location
                origin_name = "현재 위치"
        elif user_location:
            origin_coords = user_location
            origin_name = "현재 위치"

        print(f"[ROUTE_PIPELINE] 출발지: {origin_name}, 좌표: {origin_coords}")
        print(f"[ROUTE_PIPELINE] user_location: {user_location}")

        # 도착지 처리
        if destination_keyword:
            dest_result = await service.google_geocoder.geocode(destination_keyword)
            if dest_result:
                dest_coords = {"lat": dest_result["lat"], "lng": dest_result["lng"]}
                dest_name = dest_result["formatted_address"]
                print(f"[ROUTE_PIPELINE] 도착지: {dest_name}, 좌표: {dest_coords}")
            else:
                # Geocoding 실패 → FIND_PLACE로 전환
                print(f"[ROUTE_PIPELINE] Geocoding 실패 → FIND_PLACE로 전환")

                step3_result = {
                    "origin_coords": origin_coords,
                    "origin_name": origin_name,
                    "dest_coords": None,
                    "dest_name": None,
                    "intent_changed": True
                }
                steps.append({
                    "step": 3,
                    "name": "좌표변환 (Geocoding 실패)",
                    "result": step3_result
                })

                # FIND_PLACE 파이프라인으로 전환
                from ..findplace.pipeline import execute as execute_findplace
                return await execute_findplace(
                    service,
                    query,
                    classification,
                    user_location,
                    steps  # 이전 단계 결과 전달
                )

        step3_result = {
            "origin_coords": origin_coords,
            "origin_name": origin_name,
            "dest_coords": dest_coords,
            "dest_name": dest_name,
            "intent_changed": False
        }
        steps.append({
            "step": 3,
            "name": "좌표변환 (Geocoding)",
            "result": step3_result
        })
        print(f"[ROUTE_PIPELINE] Step 3 완료: {dest_name}")

        # Step 4: 경로 검색 (route-service 호출)
        if not origin_coords or not dest_coords:
            raise ValueError("출발지 또는 도착지 좌표가 없습니다")

        transportation_mode = classification.get("transportation_mode")
        route_preference = classification.get("route_preference", "fastest")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8002/api/route",
                json={
                    "origin": origin_coords,
                    "destination": dest_coords,
                    "transportation_mode": transportation_mode,
                    "route_preference": route_preference
                },
                timeout=30.0
            )
            response.raise_for_status()
            route_data = response.json()

        step4_result = {
            "paths": route_data.get("paths", []),
            "summary": {
                "total_routes": len(route_data.get("paths", [])),
                "origin": origin_name,
                "destination": dest_name
            }
        }
        steps.append({
            "step": 4,
            "name": "경로검색",
            "result": step4_result
        })
        print(f"[ROUTE_PIPELINE] Step 4 완료: {len(route_data.get('paths', []))}개 경로")

        # Step 5: 최종 응답 생성
        paths = route_data.get("paths", [])

        # 상위 10개 경로만 선택
        paths = paths[:10]

        # 모든 경로에 대한 GeoJSON 생성
        geojson = _generate_geojson_for_all_paths(paths, origin_coords, dest_coords)

        final_response = _generate_final_response(
            service,
            query,
            origin_name,
            dest_name,
            paths,
            geojson
        )

        steps.append({
            "step": 5,
            "name": "최종응답",
            "result": final_response
        })
        print(f"[ROUTE_PIPELINE] Step 5 완료")

        return {
            "intent": "ROUTE",
            "steps": steps,
            "final_response": final_response
        }

    except Exception as e:
        print(f"[ROUTE_PIPELINE] 오류: {e}")
        import traceback
        traceback.print_exc()

        # 오류 정보 추가
        steps.append({
            "step": "error",
            "name": "파이프라인 오류",
            "result": {"error": str(e)}
        })

        return {
            "intent": "ROUTE",
            "steps": steps,
            "final_response": {
                "answer": f"죄송합니다. 경로 검색 중 오류가 발생했습니다: {str(e)}",
                "error": True
            }
        }


def _generate_geojson_for_all_paths(paths: List[Dict], origin: Dict, destination: Dict) -> Dict:
    """모든 경로를 GeoJSON으로 변환 (각 경로별 색상 구분용)"""
    features = []

    # 출발지 마커
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [origin["lng"], origin["lat"]]
        },
        "properties": {
            "type": "origin",
            "name": "출발지"
        }
    })

    # 도착지 마커
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [destination["lng"], destination["lat"]]
        },
        "properties": {
            "type": "destination",
            "name": "도착지"
        }
    })

    # 각 경로별 라인 생성
    for index, path in enumerate(paths):
        # subPath에서 좌표 추출
        coordinates = []
        sub_paths = path.get("subPath", [])

        for sub_path in sub_paths:
            # passStopList에서 좌표 추출 (지하철/버스)
            if "passStopList" in sub_path and "stations" in sub_path["passStopList"]:
                stations = sub_path["passStopList"]["stations"]
                for station in stations:
                    if "x" in station and "y" in station:
                        coordinates.append([station["x"], station["y"]])
            # 도보 구간의 경우
            elif sub_path.get("trafficType") == 3:
                # 시작/끝 좌표만 추가 (상세 좌표가 없는 경우)
                if "startX" in sub_path and "startY" in sub_path:
                    coordinates.append([sub_path["startX"], sub_path["startY"]])
                if "endX" in sub_path and "endY" in sub_path:
                    coordinates.append([sub_path["endX"], sub_path["endY"]])

        # 좌표가 없으면 출발지-도착지 직선으로
        if not coordinates:
            coordinates = [
                [origin["lng"], origin["lat"]],
                [destination["lng"], destination["lat"]]
            ]

        # 경로 정보
        info = path.get("info", {})

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "properties": {
                "type": "route",
                "routeIndex": index,
                "totalTime": info.get("totalTime", 0),
                "payment": info.get("payment", 0),
                "totalDistance": info.get("totalDistance", 0)
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


def _generate_final_response(
    service,
    query: str,
    origin: str,
    destination: str,
    paths: List[Dict],
    geojson: Dict = None
) -> Dict:
    """최종 응답 생성 - Beaty 캐릭터로 응답"""

    # 경로 정보 준비
    if not paths:
        context = f"""
사용자 질문: {query}
출발지: {origin or '현재 위치'}
도착지: {destination}
결과: 경로를 찾을 수 없음
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
            print(f"[ROUTE_PIPELINE] OpenAI 호출 실패: {e}")
            answer = f"앗, {destination}까지 가는 경로를 찾을 수 없었어요."

        return {
            "answer": answer,
            "routes": [],
            "origin": origin,
            "destination": destination
        }

    # 첫 번째 경로 정보 추출
    best_path = paths[0]
    info = best_path.get("info", {})
    total_time = info.get("totalTime", 0)
    payment = info.get("payment", 0)

    # GPT로 자연스러운 응답 생성 (경로 상세 정보 제외)
    context = f"""
사용자 질문: {query}
출발지: {origin or '현재 위치'}
도착지: {destination}
경로 개수: {len(paths)}개

** 경로 상세 정보(소요시간, 요금 등)를 나열하지 말고, "{len(paths)}개 경로를 찾았다"는 내용으로 자연스럽게 응답해주세요.
** 사용자의 질문 의도에 맞춰 공감하며 짧게 답변해주세요.
"""

    try:
        client = OpenAI(api_key=service.config["openai_api_key"])
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": service.character_prompt},
                {"role": "user", "content": f"{context}\n\n위 정보를 바탕으로 주인님께 친절하고 짧게 답변해주세요. 경로 상세는 언급하지 마세요."}
            ],
            temperature=0.7
        )
        answer = response.choices[0].message.content
    except Exception as e:
        print(f"[ROUTE_PIPELINE] OpenAI 호출 실패: {e}")
        answer = f"{len(paths)}개 경로를 찾았어요!"

    return {
        "answer": answer,
        "routes": paths,
        "origin": origin,
        "destination": destination,
        "best_route": {
            "time": total_time,
            "cost": payment,
            "index": 0
        },
        "geojson": geojson
    }
