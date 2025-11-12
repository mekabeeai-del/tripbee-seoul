"""
FindPlace Query Rewriter - FIND_PLACE 의도 전용 쿼리 리라이트
자연어 쿼리를 Google Places API 필터로 변환
"""

import json
import os
from typing import Dict, Any, Optional, List
from openai import OpenAI


class FindPlaceQueryRewriter:
    """FIND_PLACE 의도 전용 쿼리 리라이터"""

    def __init__(self, openai_api_key: str, prompt_file: str = "query_rewrite_prompt.txt"):
        self.client = OpenAI(api_key=openai_api_key)
        self.prompt_file = prompt_file
        self.load_system_prompt()
        self.setup_function_definition()

    def load_system_prompt(self):
        """외부 파일에서 system prompt 로드"""
        try:
            # 현재 파일의 디렉토리 경로 기준
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompt_path = os.path.join(current_dir, self.prompt_file)

            with open(prompt_path, 'r', encoding='utf-8') as f:
                self.system_prompt = f.read()

            print(f"[FINDPLACE_REWRITER] System prompt loaded from {prompt_path}")
        except Exception as e:
            print(f"[FINDPLACE_REWRITER] Failed to load prompt file: {e}")
            # Fallback to default prompt
            self.system_prompt = "당신은 Google Places API 검색 쿼리 최적화 전문가입니다."

    def setup_function_definition(self):
        """GPT Function Calling 정의"""
        # system_prompt는 load_system_prompt()에서 이미 로드됨

        self.functions = [
            {
                "name": "rewrite_findplace_query",
                "description": "FIND_PLACE 쿼리를 Google Places API 필터로 변환합니다",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "search_keyword": {
                            "type": "string",
                            "description": "Google Places에 전달할 검색 키워드"
                        },
                        "filters": {
                            "type": "object",
                            "properties": {
                                "parking": {
                                    "type": "boolean",
                                    "description": "주차 가능 여부"
                                },
                                "good_for_children": {
                                    "type": "boolean",
                                    "description": "아이 동반 가능 여부"
                                },
                                "open_now": {
                                    "type": "boolean",
                                    "description": "현재 영업 중인지"
                                },
                                "min_rating": {
                                    "type": "number",
                                    "description": "최소 평점 (0.0 ~ 5.0)"
                                },
                                "max_price_level": {
                                    "type": "integer",
                                    "description": "최대 가격대 (0~4)"
                                },
                                "wheelchair_accessible": {
                                    "type": "boolean",
                                    "description": "휠체어 접근 가능 여부"
                                },
                                "vegetarian_food": {
                                    "type": "boolean",
                                    "description": "채식 메뉴 제공 여부"
                                },
                                "takeout": {
                                    "type": "boolean",
                                    "description": "포장 가능 여부"
                                },
                                "delivery": {
                                    "type": "boolean",
                                    "description": "배달 가능 여부"
                                },
                                "allows_dogs": {
                                    "type": "boolean",
                                    "description": "반려견 동반 가능 여부"
                                },
                                "reservable": {
                                    "type": "boolean",
                                    "description": "예약 가능 여부"
                                }
                            },
                            "description": "Google Places 필터 조건"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "검색 결과 개수 (기본 5)"
                        }
                    },
                    "required": ["search_keyword"]
                }
            }
        ]

    def rewrite(
        self,
        original_query: str,
        category_text: Optional[str] = None,
        location_keyword: Optional[str] = None,
        hard_constraints: Optional[List[str]] = None,
        emotion: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        FIND_PLACE 쿼리를 Google Places API 요청으로 변환

        Args:
            original_query: 원본 질의
            category_text: 카테고리 텍스트
            location_keyword: 위치 키워드
            hard_constraints: 절대적 조건 리스트
            emotion: 감정 키워드

        Returns:
            {
                "search_keyword": "홍대 카페",
                "filters": {
                    "parking": true,
                    "open_now": true,
                    ...
                },
                "limit": 5
            }
        """
        try:
            print(f"[FINDPLACE_REWRITER] 쿼리 리라이트 시작: '{original_query}'")

            # 입력 정보 정리
            input_info = {
                "original_query": original_query,
                "category_text": category_text,
                "location_keyword": location_keyword,
                "hard_constraints": hard_constraints or [],
                "emotion": emotion
            }

            user_message = f"""다음 정보를 바탕으로 Google Places API 검색 쿼리를 생성해주세요:

원본 질의: {original_query}
카테고리: {category_text or '없음'}
위치: {location_keyword or '없음'}
조건: {', '.join(hard_constraints) if hard_constraints else '없음'}
감정: {emotion or '없음'}

**중요**: 원본 질의에 브랜드명(스타벅스, 맥도날드, 이디야 등)이나 특정 상호명이 있으면 search_keyword는 원본 질의를 그대로 사용하세요.
브랜드명이 없을 때만 위치+카테고리 조합으로 만드세요."""

            # GPT-4o-mini Function Calling
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                functions=self.functions,
                function_call={"name": "rewrite_findplace_query"},
                temperature=0.3
            )

            # Function call 결과 파싱
            function_call = response.choices[0].message.function_call
            if not function_call:
                print("[FINDPLACE_REWRITER] Function call 없음, fallback 사용")
                return self._fallback_rewrite(input_info)

            result = json.loads(function_call.arguments)

            # 기본값 설정
            if "limit" not in result:
                result["limit"] = 5
            if "filters" not in result:
                result["filters"] = {}

            print(f"[FINDPLACE_REWRITER] 리라이트 성공:")
            print(f"  - search_keyword: {result.get('search_keyword')}")
            print(f"  - filters: {result.get('filters')}")

            return result

        except Exception as e:
            print(f"[FINDPLACE_REWRITER] 오류: {e}")
            import traceback
            traceback.print_exc()
            return self._fallback_rewrite(input_info)

    def _fallback_rewrite(self, input_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        GPT 실패 시 규칙 기반 fallback

        Args:
            input_info: 입력 정보

        Returns:
            리라이트된 쿼리
        """
        print("[FINDPLACE_REWRITER] Fallback 규칙 기반 리라이트 사용")

        # 원본 쿼리에서 브랜드명 감지 (간단한 규칙)
        original = input_info.get("original_query", "")
        common_brands = ["스타벅스", "이디야", "투썸", "맥도날드", "버거킹", "롯데리아",
                        "CU", "GS25", "세븐일레븐", "올리브영", "다이소", "이마트"]

        has_brand = any(brand in original for brand in common_brands)

        # 브랜드명이 있으면 원본 그대로 사용
        if has_brand:
            search_keyword = original
        else:
            # 검색 키워드 생성
            parts = []
            if input_info.get("location_keyword"):
                parts.append(input_info["location_keyword"])
            if input_info.get("emotion"):
                parts.append(input_info["emotion"])
            if input_info.get("category_text"):
                parts.append(input_info["category_text"])

            search_keyword = " ".join(parts) if parts else original

        # 필터 생성 (규칙 기반)
        filters = {}
        constraints = input_info.get("hard_constraints", [])

        for constraint in constraints:
            constraint_lower = constraint.lower()
            if "주차" in constraint_lower:
                filters["parking"] = True
            elif "아이" in constraint_lower or "어린이" in constraint_lower:
                filters["good_for_children"] = True
            elif "영업" in constraint_lower or "24시간" in constraint_lower:
                filters["open_now"] = True
            elif "휠체어" in constraint_lower or "장애인" in constraint_lower:
                filters["wheelchair_accessible"] = True
            elif "채식" in constraint_lower or "비건" in constraint_lower:
                filters["vegetarian_food"] = True
            elif "포장" in constraint_lower or "테이크아웃" in constraint_lower:
                filters["takeout"] = True
            elif "배달" in constraint_lower:
                filters["delivery"] = True
            elif "강아지" in constraint_lower or "반려견" in constraint_lower:
                filters["allows_dogs"] = True
            elif "예약" in constraint_lower:
                filters["reservable"] = True

        return {
            "search_keyword": search_keyword,
            "filters": filters,
            "limit": 5
        }
