from fastapi import APIRouter, HTTPException

from core import memory_store, runs_store

router = APIRouter()


@router.get("/chat-sessions")
def chat_sessions():
    return memory_store.list_chat_sessions()


@router.get("/chat-sessions/{session_id}")
def chat_session(session_id: str):
    messages = memory_store.get_chat_session(session_id)
    if not messages:
        raise HTTPException(404, "session not found")
    return messages


@router.get("/runs")
def runs():
    return runs_store.list_runs()


@router.get("/runs/{run_id}")
def run(run_id: str):
    row = runs_store.get_run(run_id)
    if row is None:
        raise HTTPException(404, "run not found")
    return row


@router.get("/facts")
def facts():
    return memory_store.list_facts()


@router.delete("/facts/{fact_id}")
def remove_fact(fact_id: int):
    memory_store.delete_fact(fact_id)
    return {"ok": True}
