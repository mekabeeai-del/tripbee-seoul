"""
Session Memory - 대화 히스토리 관리
사용자별 세션 기반 메모리 저장
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta


class Message:
    """대화 메시지"""

    def __init__(self, role: str, content: str):
        self.role = role  # "user" or "assistant"
        self.content = content
        self.timestamp = datetime.now()

    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }


class SessionMemory:
    """세션별 대화 메모리"""

    def __init__(self, max_history: int = 10):
        """
        Args:
            max_history: 최대 저장할 메시지 수 (기본 10개)
        """
        self.messages: List[Message] = []
        self.max_history = max_history
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()

    def add_message(self, role: str, content: str):
        """메시지 추가"""
        self.messages.append(Message(role, content))
        self.last_accessed = datetime.now()

        # 최대 개수 초과 시 오래된 메시지 제거
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]

    def get_context(self, last_n: Optional[int] = None) -> List[Dict]:
        """
        최근 N개 메시지 반환 (GPT API 형식)

        Args:
            last_n: 가져올 메시지 수 (None이면 전체)

        Returns:
            [{"role": "user", "content": "..."}, ...]
        """
        messages = self.messages if last_n is None else self.messages[-last_n:]
        return [{"role": msg.role, "content": msg.content} for msg in messages]

    def get_context_text(self, last_n: Optional[int] = None) -> str:
        """대화 히스토리를 텍스트로 반환 (프롬프트용)"""
        messages = self.messages if last_n is None else self.messages[-last_n:]

        if not messages:
            return ""

        lines = ["대화 히스토리:"]
        for msg in messages:
            role_name = "사용자" if msg.role == "user" else "Beaty"
            lines.append(f"{role_name}: {msg.content}")

        return "\n".join(lines)

    def clear(self):
        """메모리 초기화"""
        self.messages = []
        self.last_accessed = datetime.now()

    def is_expired(self, ttl_minutes: int = 60) -> bool:
        """세션 만료 여부 확인"""
        return (datetime.now() - self.last_accessed) > timedelta(minutes=ttl_minutes)


class SessionMemoryManager:
    """세션별 대화 메모리 관리자"""

    def __init__(self, max_history: int = 10, ttl_minutes: int = 60):
        """
        Args:
            max_history: 세션당 최대 메시지 수
            ttl_minutes: 세션 만료 시간 (분)
        """
        self.sessions: Dict[str, SessionMemory] = {}
        self.max_history = max_history
        self.ttl_minutes = ttl_minutes

    def get_session(self, session_id: Optional[str] = None) -> SessionMemory:
        """
        세션 메모리 조회 (없으면 생성)

        Args:
            session_id: 세션 ID (None이면 "default" 사용)

        Returns:
            SessionMemory 인스턴스
        """
        if session_id is None:
            session_id = "default"

        # 만료된 세션 정리
        self._cleanup_expired()

        if session_id not in self.sessions:
            self.sessions[session_id] = SessionMemory(self.max_history)
            print(f"[MEMORY] 새 세션 생성: {session_id}")

        return self.sessions[session_id]

    def clear_session(self, session_id: Optional[str] = None):
        """특정 세션 초기화"""
        if session_id is None:
            session_id = "default"

        if session_id in self.sessions:
            self.sessions[session_id].clear()
            print(f"[MEMORY] 세션 초기화: {session_id}")

    def delete_session(self, session_id: str):
        """세션 삭제"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            print(f"[MEMORY] 세션 삭제: {session_id}")

    def _cleanup_expired(self):
        """만료된 세션 정리"""
        expired = [
            sid for sid, session in self.sessions.items()
            if session.is_expired(self.ttl_minutes)
        ]

        for sid in expired:
            del self.sessions[sid]
            print(f"[MEMORY] 만료된 세션 삭제: {sid}")

    def get_session_count(self) -> int:
        """활성 세션 수 반환"""
        return len(self.sessions)


# 전역 메모리 매니저 인스턴스
memory_manager = SessionMemoryManager(max_history=10, ttl_minutes=60)
