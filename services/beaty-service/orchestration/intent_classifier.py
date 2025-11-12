"""
Intent Classifier - 의도 분류 및 슬롯 추출
SystemPrompt 로직을 Beaty 서비스 내부로 통합
"""

import json
from typing import Dict, Any
from openai import OpenAI
from pathlib import Path
import asyncpg


class IntentClassifier:
    """의도 분류 및 슬롯 추출 시스템"""

    def __init__(self, openai_api_key: str, db_config: Dict[str, Any]):
        self.client = OpenAI(api_key=openai_api_key)
        self.db_config = db_config
        self.prompt_file = Path(__file__).parent / "intent_classify_prompt.txt"
        self.categories = None  # 초기화 시 로드
        self.load_system_prompt()
        self.setup_function_definition()

    async def initialize(self):
        """비동기 초기화 - 카테고리 로드"""
        self.categories = await self._load_categories()
        # 카테고리 로드 (QueryRewriter에서 사용)
        if self.categories:
            print(f"[INTENT_CLASSIFIER] 카테고리 로드 완료: {len(self.categories.split(','))}개")

    async def _load_categories(self) -> str:
        """DB에서 카테고리 목록 로드 (서비스 시작 시 1회)"""
        try:
            # SSL 설정
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            conn = await asyncpg.connect(
                host=self.db_config["host"],
                port=self.db_config["port"],
                database=self.db_config["database"],
                user=self.db_config["user"],
                password=self.db_config["password"],
                ssl=ssl_context
            )

            # 개별 행으로 가져와서 Python에서 조합 (인코딩 문제 방지)
            rows = await conn.fetch(
                "SELECT name, cat_code FROM kto_tour_category WHERE cat_level != 0 AND is_active = TRUE AND lang = 'Kor' ORDER BY cat_code"
            )

            await conn.close()

            # Python에서 문자열 조합
            if rows:
                categories = []
                for row in rows:
                    name = row['name']
                    cat_code = row['cat_code']
                    categories.append(f"{name}({cat_code})")
                return ",".join(categories)
            else:
                return ""
        except Exception as e:
            print(f"[INTENT_CLASSIFIER] 카테고리 로드 실패: {e}")
            import traceback
            traceback.print_exc()
            return ""

    def load_system_prompt(self):
        """시스템 프롬프트 파일에서 로드"""
        try:
            if self.prompt_file.exists():
                with open(self.prompt_file, "r", encoding="utf-8") as f:
                    self.system_prompt = f.read()
                print(f"[INTENT_CLASSIFIER] System prompt loaded from {self.prompt_file}")
            else:
                # 기본 프롬프트
                self.system_prompt = """당신은 서울 관광 전문 의도 분류, 슬롯 추출, 쿼리 리라이트 시스템입니다.

의도 분류 가이드:
1. FIND_PLACE: 구체적인 장소를 찾거나 정보를 물을 때
   - 키워드: "어디야", "어디", "알려줘", "위치", "찾아줘", "주소"
   - 예시: "경복궁 어디야", "명동교자 위치", "이태원 술집 알려줘", "강남 카페 어디"

2. RECOMMEND: 추천을 요청하거나 애매한 질문 (구체적 장소명 없음)
   - 키워드: "추천", "할만한곳", "좋은곳", "괜찮은곳", "가볼만한", "유명한"
   - 예시: "맛집 추천", "할만한곳 있어?", "근처 관광지 추천", "가볼만한 카페"

3. ROUTE: 경로/길찾기 ("명동에서 경복궁 가는 길")
4. EXPERIENCE: 체험/투어 ("한복 체험", "역사 투어")
5. EVENT: 행사/이벤트 정보 ("이번 주 축제", "공연 정보")
6. RANDOM: 무작위 추천 ("아무데나 가고 싶어", "심심해", "뭐 할까") - 구체적 카테고리 없이 심심함 표현
7. GENERAL_CHAT: 일반 대화 ("안녕", "고마워")

중요: FIND_PLACE vs RECOMMEND 구분
- "홍대 술집 알려줘" → FIND_PLACE (구체적 장소 + "알려줘")
- "술집 추천해줘" → RECOMMEND (추천 키워드)
- "강남 맛집 어디야" → FIND_PLACE (구체적 장소 + "어디야")
- "맛집 추천" → RECOMMEND (추천 키워드)

슬롯 추출 원칙:
- location_keyword: 명시적 장소명만 추출 (홍대, 명동, 경복궁 등)
  * "경복궁 근처" → location_keyword="경복궁" (장소명이 명시됨)
  * "근처 관광지" → location_keyword=null (장소명 없음)
- category_text: 카테고리 관련 자연어 반드시 추출 (맛집, 일식집, 카페, 관광지, 박물관 등)
- emotion: 감정/분위기 표현 (힐링, 조용한, 예쁜, 유명한, 인기있는, 핫한 등)
- hard_constraints: 절대적 조건들 (주차가능, 무료, 아이동반 등)

중요: "근처 관광지 알려줘" = RECOMMEND + category_text="관광지" + location_keyword=null
중요: "경복궁 근처 고궁" = RECOMMEND + category_text="고궁" + location_keyword="경복궁"

중요: 추론하지 말고 명시적으로 언급된 것만 추출하세요.
중요: 서울에 위치한 지역이 아닐 경우에 위치 키워드는 없음으로 답변하세요.
"""
                # 기본 프롬프트를 파일로 저장
                self.save_system_prompt(self.system_prompt)
        except Exception as e:
            print(f"[INTENT_CLASSIFIER] Error loading system prompt: {e}")
            self.system_prompt = "당신은 서울 관광 전문 AI 어시스턴트입니다."

    def save_system_prompt(self, new_prompt: str) -> bool:
        """시스템 프롬프트를 파일에 저장"""
        try:
            with open(self.prompt_file, "w", encoding="utf-8") as f:
                f.write(new_prompt)
            self.system_prompt = new_prompt
            print(f"[INTENT_CLASSIFIER] System prompt saved to {self.prompt_file}")
            return True
        except Exception as e:
            print(f"[INTENT_CLASSIFIER] Error saving system prompt: {e}")
            return False

    def setup_function_definition(self):
        """GPT Function Calling 정의"""
        self.functions = [
            {
                "name": "extract_slots",
                "description": "사용자 입력에서 의도와 슬롯을 추출합니다",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "intent": {
                            "type": "string",
                            "enum": [
                                "FIND_PLACE",
                                "RECOMMEND",
                                "ROUTE",
                                "EXPERIENCE",
                                "EVENT",
                                "RANDOM",
                                "GENERAL_CHAT"
                            ],
                            "description": "사용자의 의도 분류"
                        },
                        "location_keyword": {
                            "type": "string",
                            "description": "[RECOMMEND/FIND_PLACE 전용] 장소/지역 키워드 (명시적으로 언급된 경우만)"
                        },
                        "emotion": {
                            "type": "string",
                            "description": "감정/분위기 키워드 (힐링, 조용한, 예쁜 등)"
                        },
                        "hard_constraints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "절대적 조건들 (주차가능, 무료, 아이동반 등)"
                        },
                        "origin_keyword": {
                            "type": "string",
                            "description": "[ROUTE 전용] 출발지 장소명 (~에서, ~부터 패턴). null이면 사용자 위치 사용"
                        },
                        "destination_keyword": {
                            "type": "string",
                            "description": "[ROUTE 전용] 도착지 장소명 (필수)"
                        },
                        "transportation_mode": {
                            "type": ["string", "null"],
                            "enum": ["subway", "bus", None],
                            "description": "[ROUTE 전용] 교통수단. subway=지하철, bus=버스, null=전체"
                        },
                        "route_preference": {
                            "type": "string",
                            "enum": ["fastest", "min_transfer", "min_walk"],
                            "description": "[ROUTE 전용] 경로 우선순위. 기본값=fastest"
                        },
                        "confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1,
                            "description": "분류 신뢰도"
                        }
                    },
                    "required": ["intent", "confidence"]
                }
            }
        ]

    def classify(self, user_input: str, context_messages: list = None) -> Dict[str, Any]:
        """
        의도 분류 및 슬롯 추출

        Args:
            user_input: 사용자 질의
            context_messages: 대화 맥락 [{"role": "user", "content": "..."}, ...]
        """
        try:
            print(f"[INTENT_CLASSIFIER] Processing: {user_input}")

            # 메시지 구성: 시스템 프롬프트 + 대화 히스토리 + 현재 질의
            messages = [{"role": "system", "content": self.system_prompt}]

            # 대화 맥락 추가 (최근 3개만)
            if context_messages:
                messages.extend(context_messages[-3:])
                print(f"[INTENT_CLASSIFIER] 대화 맥락: {len(context_messages[-3:])}개 메시지")

            messages.append({"role": "user", "content": user_input})

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                functions=self.functions,
                function_call={"name": "extract_slots"},
                temperature=0.0,
                max_tokens=300
            )

            function_call = response.choices[0].message.function_call
            if not function_call:
                return self._fallback_classification()

            slots = json.loads(function_call.arguments)

            print(f"[INTENT_CLASSIFIER] Results:")
            print(f"  Intent: {slots.get('intent', 'UNKNOWN')}")

            # ROUTE 전용 슬롯
            if slots.get('intent') == 'ROUTE':
                print(f"  Origin: {slots.get('origin_keyword', 'None (user location)')}")
                print(f"  Destination: {slots.get('destination_keyword', 'None')}")
                print(f"  Transport: {slots.get('transportation_mode', 'None (all)')}")
                print(f"  Preference: {slots.get('route_preference', 'fastest')}")
            # RECOMMEND/FIND_PLACE 전용 슬롯
            else:
                print(f"  Location: {slots.get('location_keyword', 'None')}")
                print(f"  Emotion: {slots.get('emotion', 'None')}")
                print(f"  Constraints: {slots.get('hard_constraints', [])}")

            print(f"  Confidence: {slots.get('confidence', 0.0)}")

            return slots

        except Exception as e:
            print(f"[INTENT_CLASSIFIER] Error: {e}")
            return self._fallback_classification()

    def _fallback_classification(self) -> Dict[str, Any]:
        """에러시 폴백 분류 결과"""
        return {
            "intent": "GENERAL_CHAT",
            "location_keyword": None,
            "emotion": None,
            "hard_constraints": [],
            "confidence": 0.0
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

    classifier = IntentClassifier(openai_api_key)

    # 테스트
    test_queries = [
        "홍대 맛집 추천해줘",
        "경복궁 어디야?",
        "안녕하세요",
        "조용한 카페 알려줘"
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        result = classifier.classify(query)
        print(f"Result: {json.dumps(result, ensure_ascii=False, indent=2)}")
