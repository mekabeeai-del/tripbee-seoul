import httpx
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode


class ODSayClient:
    """ODSay API 클라이언트"""

    BASE_URL = "https://api.odsay.com/v1/api"

    def __init__(self, api_key: str):
        self.api_key = api_key
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.client = httpx.AsyncClient(timeout=30.0, headers=headers)

    async def close(self):
        """클라이언트 종료"""
        await self.client.aclose()

    async def search_pub_trans_path(
        self,
        start_x: float,
        start_y: float,
        end_x: float,
        end_y: float,
        search_type: int = 0,  # 0:빠른시간, 1:최소환승, 2:최소도보
        search_path_type: int = 0  # 0:전체, 1:지하철, 2:버스, 3:버스+지하철
    ) -> Dict[str, Any]:
        """
        대중교통 경로 검색

        Args:
            start_x: 출발지 경도
            start_y: 출발지 위도
            end_x: 도착지 경도
            end_y: 도착지 위도
            search_type: 경로 정렬 기준 (0:빠른시간, 1:최소환승, 2:최소도보)
            search_path_type: 교통수단 (0:전체, 1:지하철, 2:버스, 3:버스+지하철)

        Returns:
            경로 검색 결과 JSON
        """
        url = f"{self.BASE_URL}/searchPubTransPath"

        params = {
            "apiKey": self.api_key,
            "SX": start_x,
            "SY": start_y,
            "EX": end_x,
            "EY": end_y,
            "SearchType": search_type,
            "SearchPathType": search_path_type,
        }

        # URL 인코딩 확인용 로그
        full_url = f"{url}?{urlencode(params)}"
        print(f"ODSay API Full URL: {full_url}")
        print(f"Params: {params}")

        response = await self.client.get(url, params=params)
        print(f"Response status: {response.status_code}")
        print(f"Actual request URL: {response.request.url}")

        response.raise_for_status()

        result = response.json()
        print(f"ODSay Response: {result}")

        return result

    async def load_lane(
        self,
        map_obj: str
    ) -> Dict[str, Any]:
        """
        경로 그래픽 데이터 조회 (graphPos)

        Args:
            map_obj: searchPubTransPath에서 받은 lane의 mapObj 값

        Returns:
            graphPos 배열이 포함된 JSON
        """
        url = f"{self.BASE_URL}/loadLane"

        params = {
            "apiKey": self.api_key,
            "mapObject": f"0:0@{map_obj}"
        }

        response = await self.client.get(url, params=params)
        response.raise_for_status()

        return response.json()

    async def get_route_with_geometry(
        self,
        start_x: float,
        start_y: float,
        end_x: float,
        end_y: float,
        search_type: int = 0,
        search_path_type: int = 0
    ) -> Dict[str, Any]:
        """
        경로 검색 + 그래픽 데이터 통합

        Returns:
            {
                "paths": [...],  # 경로 리스트
                "geometry": {...}  # GeoJSON FeatureCollection
            }
        """
        # 1. 경로 검색
        search_result = await self.search_pub_trans_path(
            start_x, start_y, end_x, end_y,
            search_type, search_path_type
        )

        if "result" not in search_result or "path" not in search_result["result"]:
            print(f"No result or path in search_result: {search_result}")
            return {"paths": [], "geometry": None, "debug": search_result}

        paths = search_result["result"]["path"]

        # 2. 첫 번째 경로의 graphPos 데이터 수집
        features = []

        if len(paths) > 0:
            first_path = paths[0]

            # 출발지 마커
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [start_x, start_y]
                },
                "properties": {
                    "type": "origin",
                    "name": "출발"
                }
            })

            # 각 subPath의 경로 그리기
            for sub_path in first_path.get("subPath", []):
                traffic_type = sub_path.get("trafficType")

                # 지하철(1) 또는 버스(2)인 경우 lane 정보에서 graphPos 추출
                if traffic_type in [1, 2] and "lane" in sub_path:
                    for lane in sub_path["lane"]:
                        if "mapObj" in lane:
                            try:
                                # loadLane API 호출
                                lane_data = await self.load_lane(lane["mapObj"])

                                if "result" in lane_data and "lane" in lane_data["result"]:
                                    for lane_info in lane_data["result"]["lane"]:
                                        graph_pos = lane_info.get("graphPos", [])

                                        if len(graph_pos) > 0:
                                            # graphPos를 LineString으로 변환
                                            coordinates = [[p["x"], p["y"]] for p in graph_pos]

                                            features.append({
                                                "type": "Feature",
                                                "geometry": {
                                                    "type": "LineString",
                                                    "coordinates": coordinates
                                                },
                                                "properties": {
                                                    "type": "subway" if traffic_type == 1 else "bus",
                                                    "name": lane.get("name", ""),
                                                    "class": lane_info.get("class")
                                                }
                                            })
                            except Exception as e:
                                print(f"loadLane error: {e}")
                                continue

                # 도보(3)인 경우 시작-끝 포인트만
                elif traffic_type == 3:
                    start_x_walk = sub_path.get("startX")
                    start_y_walk = sub_path.get("startY")
                    end_x_walk = sub_path.get("endX")
                    end_y_walk = sub_path.get("endY")

                    if all([start_x_walk, start_y_walk, end_x_walk, end_y_walk]):
                        features.append({
                            "type": "Feature",
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [
                                    [start_x_walk, start_y_walk],
                                    [end_x_walk, end_y_walk]
                                ]
                            },
                            "properties": {
                                "type": "walk",
                                "distance": sub_path.get("distance"),
                                "time": sub_path.get("sectionTime")
                            }
                        })

            # 도착지 마커
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [end_x, end_y]
                },
                "properties": {
                    "type": "destination",
                    "name": "도착"
                }
            })

        geojson = {
            "type": "FeatureCollection",
            "features": features
        }

        return {
            "paths": paths,
            "geometry": geojson
        }
