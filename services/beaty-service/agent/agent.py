"""
Beaty Agent - LLM 기반 도구 사용 에이전트
"""

import json
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from openai import OpenAI

from agent.prompts import BEATY_SYSTEM_PROMPT
from tools import get_all_tools, execute_tool

logger = logging.getLogger(__name__)


class BeatyAgent:
    """Beaty AI 에이전트 - 도구 사용 기반"""

    def __init__(self, openai_api_key: str):
        self.client = OpenAI(api_key=openai_api_key)
        self.model = "gpt-4o-mini"  # 비용 효율적인 모델
        self.tools = get_all_tools()

    async def process_query(
        self,
        query: str,
        user_location: Optional[Dict[str, float]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        사용자 쿼리 처리 (스트리밍)

        Yields:
            {"type": "tool_call", "name": str, "arguments": dict}
            {"type": "tool_result", "name": str, "result": dict}
            {"type": "chunk", "text": str}
            {"type": "data", "pois": [...], "routes": [...], ...}
            {"type": "done"}
        """
        try:
            # 메시지 구성
            messages = [{"role": "system", "content": BEATY_SYSTEM_PROMPT}]

            # 대화 히스토리 추가
            if conversation_history:
                messages.extend(conversation_history[-6:])  # 최근 6개

            # 현재 쿼리 추가 (위치 정보 포함)
            user_message = query
            if user_location:
                user_message += f"\n\n[사용자 위치: 위도 {user_location['lat']}, 경도 {user_location['lng']}]"

            messages.append({"role": "user", "content": user_message})

            # 수집된 데이터
            collected_data = {}
            tool_calls_made = []
            tool_results = []

            # 도구 호출 루프 (최대 3회)
            for iteration in range(3):
                logger.info(f"[AGENT] Iteration {iteration + 1}")

                # LLM 호출
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=self.tools,
                    tool_choice="auto",
                    temperature=0.7
                )

                assistant_message = response.choices[0].message

                # 도구 호출이 있는 경우
                if assistant_message.tool_calls:
                    messages.append(assistant_message)

                    for tool_call in assistant_message.tool_calls:
                        tool_name = tool_call.function.name
                        tool_args = json.loads(tool_call.function.arguments)

                        logger.info(f"[AGENT] Tool call: {tool_name}({tool_args})")

                        # 도구 호출 이벤트 전송
                        yield {
                            "type": "tool_call",
                            "name": tool_name,
                            "arguments": tool_args
                        }

                        # 사용자 위치 주입 (필요한 경우)
                        if user_location:
                            if tool_name == "get_random_poi" and "user_lat" not in tool_args:
                                tool_args["user_lat"] = user_location["lat"]
                                tool_args["user_lng"] = user_location["lng"]
                            elif tool_name == "search_route" and "origin_coords" not in tool_args and "origin" not in tool_args:
                                tool_args["origin_coords"] = {
                                    "lat": user_location["lat"],
                                    "lng": user_location["lng"]
                                }

                        # 도구 실행
                        result = await execute_tool(tool_name, tool_args)

                        logger.info(f"[AGENT] Tool result: success={result.get('success')}")

                        # 도구 결과 이벤트 전송
                        yield {
                            "type": "tool_result",
                            "name": tool_name,
                            "result": result
                        }

                        # 결과 저장
                        tool_calls_made.append({"name": tool_name, "arguments": tool_args})
                        tool_results.append(result)

                        # 데이터 수집
                        if result.get("success") and result.get("data"):
                            data = result["data"]
                            if "pois" in data:
                                collected_data["pois"] = data["pois"]
                            if "places" in data:
                                collected_data["places"] = data["places"]
                            if "paths" in data:
                                collected_data["routes"] = data["paths"]
                            if "poi" in data:
                                collected_data["poi"] = data["poi"]
                            if "landmarks" in data:
                                collected_data["landmarks"] = data["landmarks"]

                        # 메시지에 도구 결과 추가
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result, ensure_ascii=False)
                        })

                    # 다음 이터레이션에서 응답 생성
                    continue

                # 도구 호출 없이 텍스트 응답인 경우
                else:
                    # 수집된 데이터 전송
                    if collected_data:
                        yield {
                            "type": "data",
                            **collected_data
                        }

                    # 스트리밍 응답 생성
                    stream = self.client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        stream=True,
                        temperature=0.7
                    )

                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            yield {
                                "type": "chunk",
                                "text": chunk.choices[0].delta.content
                            }

                    break

            # 완료 이벤트
            yield {"type": "done"}

        except Exception as e:
            logger.error(f"[AGENT] Error: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "message": str(e)
            }

    async def process_query_simple(
        self,
        query: str,
        user_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        단순 쿼리 처리 (비스트리밍)

        Returns:
            {
                "success": bool,
                "answer": str,
                "data": {...}  # pois, routes 등
            }
        """
        chunks = []
        data = {}

        async for event in self.process_query(query, user_location):
            if event["type"] == "chunk":
                chunks.append(event["text"])
            elif event["type"] == "data":
                data = {k: v for k, v in event.items() if k != "type"}
            elif event["type"] == "error":
                return {
                    "success": False,
                    "answer": event["message"],
                    "data": None
                }

        return {
            "success": True,
            "answer": "".join(chunks),
            "data": data if data else None
        }
