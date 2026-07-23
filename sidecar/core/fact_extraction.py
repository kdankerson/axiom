"""Best-effort extraction of durable facts from a finished chat session.

Runs as a fire-and-forget background task after a chat websocket disconnects
— failures here should never affect the chat experience itself.
"""

import json
import logging

from . import memory_store
from .claude_cli import stream_query

logger = logging.getLogger("axiom.fact_extraction")

EXTRACTION_PROMPT = """\
Below is a conversation transcript. Extract any durable facts or preferences
about the user worth remembering for future conversations (name, projects,
tools/stack they use, ongoing goals, stated preferences). Ignore one-off
questions and anything not worth remembering long-term.

Respond with ONLY a JSON array of short strings, one per fact. If there is
nothing worth remembering, respond with an empty array: []

Transcript:
{transcript}
"""


async def extract_facts(session_id: str) -> None:
    messages = memory_store.get_chat_session(session_id)
    if len(messages) < 2:
        return  # nothing exchanged worth extracting from

    transcript = "\n".join(f"{m['role']}: {m['text']}" for m in messages)
    prompt = EXTRACTION_PROMPT.format(transcript=transcript)

    result_text = ""
    try:
        async for event in stream_query(prompt):
            if event.get("type") == "result":
                result_text = str(event.get("result", ""))
    except Exception:
        logger.exception("fact extraction CLI call failed for session %s", session_id)
        return

    try:
        facts = json.loads(result_text)
    except (json.JSONDecodeError, TypeError):
        logger.warning("fact extraction returned non-JSON output, skipping")
        return

    if not isinstance(facts, list):
        return

    for fact in facts:
        if isinstance(fact, str) and fact.strip():
            memory_store.add_fact(fact.strip(), source=f"chat:{session_id}")
