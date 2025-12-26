"""
Response Generator - GPT 응답 생성 헬퍼
모든 파이프라인에서 사용할 수 있는 공통 응답 생성기
"""

from typing import AsyncGenerator, List, Dict
from .gpt_streaming import stream_gpt_response


async def create_streaming_response(
    service,
    context: str,
    instruction: str = "위 정보를 바탕으로 주인님께 친절하게 답변해주세요."
) -> AsyncGenerator[str, None]:
    """
    GPT 스트리밍 응답 생성

    Args:
        service: BeatyService 인스턴스
        context: GPT에게 제공할 컨텍스트
        instruction: 추가 지시사항

    Yields:
        str: GPT 응답 chunk
    """
    messages = [
        {"role": "system", "content": service.character_prompt},
        {"role": "user", "content": f"{context}\n\n{instruction}"}
    ]

    async for chunk in stream_gpt_response(service.client, messages):
        yield chunk


async def create_streaming_response_with_messages(
    service,
    messages: List[Dict[str, str]]
) -> AsyncGenerator[str, None]:
    """
    커스텀 메시지로 GPT 스트리밍 응답 생성

    Args:
        service: BeatyService 인스턴스
        messages: GPT 메시지 배열

    Yields:
        str: GPT 응답 chunk
    """
    async for chunk in stream_gpt_response(service.client, messages):
        yield chunk
