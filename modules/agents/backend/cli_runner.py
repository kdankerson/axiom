from collections.abc import AsyncIterator

from core.claude_cli import ClaudeCliNotFound, stream_query


async def run_task(task: str, cwd: str | None = None) -> AsyncIterator[dict]:
    # No need for --include-partial-messages here: the coarse assistant/user
    # messages already arrive progressively as each block completes, and the
    # frontend only renders those — the raw per-token stream_event noise
    # would just add payload without anything consuming it.
    agen = stream_query(task, include_partial_messages=False, cwd=cwd)
    try:
        async for event in agen:
            yield event
    except ClaudeCliNotFound as err:
        yield {"type": "error", "message": str(err)}
    finally:
        await agen.aclose()
