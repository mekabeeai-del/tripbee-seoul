"""
Simple Memory - 대화 히스토리 관리
사용자별 세션 기반 메모리 저장 (LangChain 1.0 호환)
"""

from typing import Dict, Optional, List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage


class SimpleChatMemory:
    """간단한 대화 메모리 (BaseMessage 리스트 저장)"""

    def __init__(self):
        self.messages: List[BaseMessage] = []

    def add_user_message(self, content: str):
        """사용자 메시지 추가"""
        self.messages.append(HumanMessage(content=content))

    def add_ai_message(self, content: str):
        """AI 메시지 추가"""
        self.messages.append(AIMessage(content=content))

    def clear(self):
        """메모리 초기화"""
        self.messages = []


class SessionMemoryManager:
    """세션별 대화 메모리 관리자"""

    def __init__(self):
        # 세션 ID별 메모리 저장소
        self._memories: Dict[str, SimpleChatMemory] = {}

    def get_memory(self, session_id: Optional[str] = None) -> SimpleChatMemory:
        """
        세션 ID로 메모리 조회 (없으면 생성)

        Args:
            session_id: 세션 ID (없으면 'default' 사용)

        Returns:
            SimpleChatMemory 인스턴스
        """
        if session_id is None:
            session_id = "default"

        if session_id not in self._memories:
            self._memories[session_id] = SimpleChatMemory()
            print(f"[MEMORY] 새 세션 생성: {session_id}")

        return self._memories[session_id]

    def clear_memory(self, session_id: Optional[str] = None):
        """
        특정 세션의 메모리 초기화

        Args:
            session_id: 세션 ID (없으면 'default')
        """
        if session_id is None:
            session_id = "default"

        if session_id in self._memories:
            self._memories[session_id].clear()
            print(f"[MEMORY] 세션 초기화: {session_id}")

    def clear_all(self):
        """모든 세션 메모리 초기화"""
        self._memories.clear()
        print("[MEMORY] 모든 세션 초기화")

    def get_session_count(self) -> int:
        """활성 세션 수 반환"""
        return len(self._memories)

    def get_history(self, session_id: Optional[str] = None) -> List[BaseMessage]:
        """
        특정 세션의 대화 히스토리 조회

        Args:
            session_id: 세션 ID

        Returns:
            BaseMessage 리스트
        """
        memory = self.get_memory(session_id)
        return memory.messages

    def add_message(
        self,
        session_id: Optional[str],
        user_message: str,
        ai_message: str
    ):
        """
        수동으로 메시지 추가 (디버깅/테스트용)

        Args:
            session_id: 세션 ID
            user_message: 사용자 메시지
            ai_message: AI 응답
        """
        memory = self.get_memory(session_id)
        memory.add_user_message(user_message)
        memory.add_ai_message(ai_message)
        print(f"[MEMORY] 메시지 추가 - session: {session_id}")


# 전역 메모리 매니저 인스턴스
memory_manager = SessionMemoryManager()
