from collections.abc import AsyncIterator

from core.claude_cli import stream_query


async def stream_reply(message: str) -> AsyncIterator[str]:
    async for event in stream_query(message, include_partial_messages=True):
        if event.get("type") != "stream_event":
            continue
        inner = event.get("event", {})
        if inner.get("type") != "content_block_delta":
            continue
        delta = inner.get("delta", {})
        if delta.get("type") == "text_delta":
            yield delta.get("text", "")
