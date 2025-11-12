"""
Query Rewriter - 쿼리 리라이트 (자연어 → 구조화된 검색 요청)
분류/해결된 정보를 바탕으로 최적의 검색 쿼리 생성
"""

import json
from typing import Dict, Any, Optional
from openai import OpenAI
from pathlib import Path


class QueryRewriter:
    """쿼리 리라이트 시스템"""

    def __init__(self, openai_api_key: str):
        self.client = OpenAI(api_key=openai_api_key)
        self.prompt_file = Path(__file__).parent / "query_rewrite_prompt.txt"
        self.load_system_prompt()
        self.setup_function_definition()

    def load_system_prompt(self):
        """시스템 프롬프트 파일에서 로드"""
        try:
            if self.prompt_file.exists():
                with open(self.prompt_file, "r", encoding="utf-8") as f:
                    self.system_prompt = f.read()
                print(f"[QUERY_REWRITER] System prompt loaded from {self.prompt_file}")
            else:
                # 기본 프롬프트
                self.system_prompt = """당신은 서울 여행 검색 쿼리 최적화 전문가입니다.

역할:
- 사용자의 자연어 질의와 분류/해결된 정보를 받아서
- Recommend 서비스에 전달할 최적의 검색 쿼리를 생성합니다

입력 정보:
1. original_query: 사용자의 원본 질의
2. intent: 분류된 의도 (RECOMMEND, FIND_PLACE 등)
3. category: 해결된 카테고리 정보 (cat_code, cat_level, content_type_id)
4. geometry_id: 해결된 거점 위치 ID
5. user_location: 사용자 현재 위치 (lat, lng)
6. hard_constraints: 절대적 조건 리스트
7. emotion: 감정/분위기 키워드

출력 규칙:
1. query_text: 검색에 사용할 최적화된 텍스트 (원본 질의 기반, 필요시 개선)
2. filters: hard_constraints를 구조화된 필터로 변환
   - "주차" → is_parking_available: true
   - "무료" → is_free_admission: true
   - "카드" → is_credit_card_ok: true
   - "24시간/24시" → is_currently_open: true
3. preferences: emotion을 배열로 변환
   - emotion: "힐링, 조용한" → emotions: ["힐링", "조용한"]

중요:
- 사용자 의도를 정확히 반영
- 불필요한 정보 제거
- 검색 효율성 최대화
"""
                # 기본 프롬프트를 파일로 저장
                self.save_system_prompt(self.system_prompt)
        except Exception as e:
            print(f"[QUERY_REWRITER] Error loading system prompt: {e}")
            self.system_prompt = "당신은 검색 쿼리 최적화 전문가입니다."

    def save_system_prompt(self, new_prompt: str) -> bool:
        """시스템 프롬프트를 파일에 저장"""
        try:
            with open(self.prompt_file, "w", encoding="utf-8") as f:
                f.write(new_prompt)
            self.system_prompt = new_prompt
            print(f"[QUERY_REWRITER] System prompt saved to {self.prompt_file}")
            return True
        except Exception as e:
            print(f"[QUERY_REWRITER] Error saving system prompt: {e}")
            return False

    def setup_function_definition(self):
        """GPT Function Calling 정의"""
        self.functions = [
            {
                "name": "rewrite_query",
                "description": "검색 쿼리를 최적화하여 구조화된 요청으로 변환합니다",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query_text": {
                            "type": "string",
                            "description": "최적화된 검색 텍스트"
                        },
                        "filters": {
                            "type": "object",
                            "properties": {
                                "is_parking_available": {"type": "boolean"},
                                "is_free_admission": {"type": "boolean"},
                                "is_credit_card_ok": {"type": "boolean"},
                                "is_currently_open": {"type": "boolean"}
                            },
                            "description": "절대적 필터 조건"
                        },
                        "preferences": {
                            "type": "object",
                            "properties": {
                                "emotions": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "감정/분위기 키워드 배열"
                                }
                            },
                            "description": "선호 조건"
                        },
                        "core_keywords": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "POI 제목/설명 LIKE 검색용 핵심 키워드 (예: '라멘이나 우동 맛집' → ['라멘', '우동']). 음식메뉴, 특정시설명 등 구체적 키워드만 추출"
                        },
                        "reasoning": {
                            "type": "string",
                            "description": "리라이트 이유 (디버깅용)"
                        }
                    },
                    "required": ["query_text"]
                }
            }
        ]

    def rewrite(
        self,
        original_query: str,
        intent: str,
        category: Optional[Dict],
        geometry_id: Optional[int],
        user_location: Optional[Dict],
        hard_constraints: list,
        emotion: Optional[str]
    ) -> Dict[str, Any]:
        """쿼리 리라이트 수행"""
        try:
            print(f"[QUERY_REWRITER] Rewriting: {original_query}")

            # 컨텍스트 구성
            context = {
                "original_query": original_query,
                "intent": intent,
                "category": category,
                "geometry_id": geometry_id,
                "user_location": user_location,
                "hard_constraints": hard_constraints,
                "emotion": emotion
            }

            context_str = f"""원본 질의: {original_query}
의도: {intent}
카테고리: {json.dumps(category, ensure_ascii=False) if category else 'None'}
거점 위치 ID: {geometry_id if geometry_id else 'None'}
사용자 위치: {json.dumps(user_location, ensure_ascii=False) if user_location else 'None'}
절대 조건: {hard_constraints}
감정/분위기: {emotion if emotion else 'None'}

위 정보를 바탕으로 최적의 검색 쿼리를 생성하세요."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": context_str}
                ],
                functions=self.functions,
                function_call={"name": "rewrite_query"},
                temperature=0.2,
                max_tokens=500
            )

            function_call = response.choices[0].message.function_call
            if not function_call:
                return self._fallback_rewrite(original_query, hard_constraints, emotion)

            result = json.loads(function_call.arguments)

            print(f"[QUERY_REWRITER] Rewritten query: {result.get('query_text')}")
            print(f"[QUERY_REWRITER] Filters: {result.get('filters', {})}")
            print(f"[QUERY_REWRITER] Preferences: {result.get('preferences', {})}")
            if result.get('reasoning'):
                print(f"[QUERY_REWRITER] Reasoning: {result.get('reasoning')}")

            return result

        except Exception as e:
            print(f"[QUERY_REWRITER] Error: {e}")
            return self._fallback_rewrite(original_query, hard_constraints, emotion)

    def _fallback_rewrite(self, query: str, hard_constraints: list, emotion: Optional[str]) -> Dict[str, Any]:
        """에러시 폴백 리라이트"""
        filters = {}
        for constraint in hard_constraints:
            if "주차" in constraint:
                filters["is_parking_available"] = True
            elif "무료" in constraint:
                filters["is_free_admission"] = True
            elif "카드" in constraint:
                filters["is_credit_card_ok"] = True
            elif "24시간" in constraint or "24시" in constraint:
                filters["is_currently_open"] = True

        preferences = {}
        if emotion:
            preferences["emotions"] = [e.strip() for e in emotion.split(",")]

        return {
            "query_text": query,
            "filters": filters if filters else None,
            "preferences": preferences if preferences else None,
            "reasoning": "Fallback rewrite (no GPT)"
        }


# 테스트 코드
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()

    # Config 로드
    config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
        import re
        config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
        if config_match:
            config_str = '{' + config_match.group(1) + '}'
            config = json.loads(config_str.replace('\t', ''))
            openai_api_key = config["openai_api_key"]

    rewriter = QueryRewriter(openai_api_key)

    # 테스트
    result = rewriter.rewrite(
        original_query="홍대 근처 조용한 카페 추천해줘, 주차 가능한 곳으로",
        intent="RECOMMEND",
        category={"cat_code": "A05020900", "cat_level": 3, "content_type_id": 39},
        geometry_id=123,
        user_location={"lat": 37.5665, "lng": 126.9780},
        hard_constraints=["주차가능"],
        emotion="조용한, 힐링"
    )

    print(f"\n{'='*60}")
    print(f"Result: {json.dumps(result, ensure_ascii=False, indent=2)}")
