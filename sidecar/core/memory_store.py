"""Chat transcript history + durable facts extracted from past conversations."""

from . import db as _db


def log_chat_message(session_id: str, role: str, text: str) -> None:
    _db.execute(
        "INSERT INTO chat_messages (session_id, role, text) VALUES (?, ?, ?)",
        (session_id, role, text),
    )


def list_chat_sessions(limit: int = 100) -> list[dict]:
    rows = _db.query(
        """
        SELECT session_id,
               MIN(created_at) AS started_at,
               MAX(created_at) AS last_at,
               COUNT(*) AS message_count
        FROM chat_messages
        GROUP BY session_id
        ORDER BY started_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(r) for r in rows]


def get_chat_session(session_id: str) -> list[dict]:
    rows = _db.query(
        "SELECT role, text, created_at FROM chat_messages WHERE session_id = ? ORDER BY id",
        (session_id,),
    )
    return [dict(r) for r in rows]


def add_fact(text: str, source: str) -> None:
    _db.execute("INSERT INTO memory_facts (text, source) VALUES (?, ?)", (text, source))


def list_facts(limit: int = 200) -> list[dict]:
    rows = _db.query(
        "SELECT id, text, source, created_at FROM memory_facts ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    return [dict(r) for r in rows]


def delete_fact(fact_id: int) -> None:
    _db.execute("DELETE FROM memory_facts WHERE id = ?", (fact_id,))


def recent_facts_prompt(limit: int = 20) -> str | None:
    """Formats recent facts as system-prompt context, or None if there are none yet."""
    facts = list_facts(limit=limit)
    if not facts:
        return None
    lines = "\n".join(f"- {f['text']}" for f in reversed(facts))
    return f"Known context about the user from past sessions:\n{lines}"
