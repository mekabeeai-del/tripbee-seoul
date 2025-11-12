"""
LangChain Agent - Beaty AI Agent 설정 및 실행
LangGraph create_react_agent 기반 대화형 여행 플래너
"""

from typing import Optional, Dict, Any, List
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .prompts import BEATY_SYSTEM_PROMPT
from .tools import (
    RecommendTool,
    RouteTool,
    FindPlaceTool,
    LandmarkTool,
    RandomPOITool
)
from .memory import memory_manager


class BeatyAgent:
    """Beaty AI Agent - 대화형 여행 도우미"""

    def __init__(self, openai_api_key: str):
        """
        Agent 초기화

        Args:
            openai_api_key: OpenAI API 키
        """
        self.openai_api_key = openai_api_key

        # LLM 설정 (GPT-4o-mini)
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,  # 빠른 추론을 위해 낮춤 (기존 0.7)
            max_tokens=500,   # 응답 길이 제한으로 속도 향상
            api_key=openai_api_key,
            request_timeout=15  # 타임아웃 15초
        )

        # 도구 리스트 (전체 5개)
        self.tools = [
            RecommendTool(),     # POI 추천
            RouteTool(),         # 경로 검색
            FindPlaceTool(),     # Google Places 검색
            LandmarkTool(),      # 랜드마크 조회
            RandomPOITool()      # 랜덤 POI 추천
        ]

        # LangGraph Agent 생성
        self.agent_graph = create_react_agent(
            model=self.llm,
            tools=self.tools
        )

        print("[BEATY_AGENT] Agent 초기화 완료")
        print(f"[BEATY_AGENT] 사용 가능한 도구: {[tool.name for tool in self.tools]}")

    def run(
        self,
        query: str,
        session_id: Optional[str] = None,
        user_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Agent 실행

        Args:
            query: 사용자 질의
            session_id: 세션 ID (대화 히스토리 관리)
            user_location: 사용자 위치 {"lat": 37.5665, "lng": 126.9780}

        Returns:
            {
                "response": "AI 응답 텍스트",
                "intermediate_steps": [...],  # 중간 실행 단계
                "chat_history": [...]         # 대화 히스토리
            }
        """
        try:
            # 세션별 메모리 가져오기
            memory = memory_manager.get_memory(session_id)

            # 사용자 위치 정보를 입력에 추가 (필요 시)
            user_input = query
            if user_location:
                location_context = f"\n\n[사용자 현재 위치: 위도 {user_location['lat']}, 경도 {user_location['lng']}]"
                user_input = query + location_context

            print(f"\n{'='*60}")
            print(f"[BEATY_AGENT] 질의: {query}")
            print(f"[BEATY_AGENT] 세션: {session_id or 'default'}")
            print(f"{'='*60}\n")

            # 대화 히스토리 가져오기
            chat_history = memory.messages

            # Agent 실행 (messages 형식 - 시스템 메시지 포함)
            messages = [SystemMessage(content=BEATY_SYSTEM_PROMPT)] + chat_history + [HumanMessage(content=user_input)]

            result = self.agent_graph.invoke({
                "messages": messages
            })

            # 응답 추출
            ai_response = result["messages"][-1].content

            # LangGraph의 messages에서 도구 사용 추출
            from langchain_core.messages import AIMessage, ToolMessage

            intermediate_steps = []
            result_messages = result["messages"]

            for i, msg in enumerate(result_messages):
                if isinstance(msg, AIMessage) and msg.tool_calls:
                    # AI가 도구를 호출한 경우
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name")
                        # 다음 메시지에서 ToolMessage 찾기
                        if i + 1 < len(result_messages) and isinstance(result_messages[i + 1], ToolMessage):
                            tool_output = result_messages[i + 1].content
                            # (AgentAction, output) 형태로 저장
                            from collections import namedtuple
                            AgentAction = namedtuple('AgentAction', ['tool'])
                            intermediate_steps.append((AgentAction(tool=tool_name), tool_output))

            # 메모리에 대화 저장
            memory.add_user_message(query)
            memory.add_ai_message(ai_response)

            print(f"\n{'='*60}")
            print(f"[BEATY_AGENT] 응답 생성 완료")
            print(f"[BEATY_AGENT] 사용된 도구: {[step[0].tool for step in intermediate_steps]}")
            print(f"{'='*60}\n")

            return {
                "response": ai_response,
                "intermediate_steps": intermediate_steps,
                "chat_history": memory.messages
            }

        except Exception as e:
            print(f"[BEATY_AGENT] 오류 발생: {e}")
            import traceback
            traceback.print_exc()

            return {
                "response": f"죄송해요, 처리 중 오류가 발생했어요: {str(e)}",
                "intermediate_steps": [],
                "chat_history": []
            }

    def add_tool(self, tool):
        """
        도구 추가 (런타임에 도구 확장 가능)

        Args:
            tool: LangChain BaseTool 인스턴스
        """
        self.tools.append(tool)
        print(f"[BEATY_AGENT] 도구 추가: {tool.name}")

        # Agent 재생성
        self.agent_graph = create_react_agent(
            model=self.llm,
            tools=self.tools
        )

    def get_available_tools(self) -> List[str]:
        """사용 가능한 도구 목록 반환"""
        return [tool.name for tool in self.tools]

    def clear_session(self, session_id: Optional[str] = None):
        """세션 메모리 초기화"""
        memory_manager.clear_memory(session_id)
        print(f"[BEATY_AGENT] 세션 초기화: {session_id or 'default'}")
