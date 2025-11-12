"""
GPT Streaming Utility
OpenAI GPT 응답을 스트리밍으로 처리하는 공통 유틸리티
"""

from typing import AsyncGenerator
from openai import OpenAI


async def stream_gpt_response(
    client: OpenAI,
    messages: list,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = None
) -> AsyncGenerator[str, None]:
    """
    OpenAI GPT 응답을 스트리밍으로 생성

    Args:
        client: OpenAI client instance
        messages: 메시지 배열 [{"role": "system", "content": "..."}, ...]
        model: 사용할 모델
        temperature: 온도 설정
        max_tokens: 최대 토큰 수

    Yields:
        str: GPT 응답 chunk
    """
    try:
        # OpenAI 스트리밍 요청
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True  # 스트리밍 활성화
        )

        # 각 chunk를 yield
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                yield content

    except Exception as e:
        print(f"[GPT_STREAMING] 오류: {e}")
        yield f"[오류 발생: {str(e)}]"


def get_full_response_from_stream(
    client: OpenAI,
    messages: list,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = None
) -> str:
    """
    스트리밍을 사용하되 전체 응답을 문자열로 반환 (non-streaming 대체용)
    기존 코드 호환성을 위한 함수

    Args:
        client: OpenAI client instance
        messages: 메시지 배열
        model: 사용할 모델
        temperature: 온도 설정
        max_tokens: 최대 토큰 수

    Returns:
        str: 전체 GPT 응답
    """
    try:
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )

        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                full_response += chunk.choices[0].delta.content

        return full_response

    except Exception as e:
        print(f"[GPT_STREAMING] 오류: {e}")
        return f"[오류 발생: {str(e)}]"
