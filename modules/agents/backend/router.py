import asyncio
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from core import runs_store

from .cli_runner import run_task
from .live import hub

router = APIRouter()


class TaskIn(BaseModel):
    task: str
    cwd: str | None = None


@router.post("/tasks")
async def start_task(body: TaskIn):
    run_id = str(uuid.uuid4())
    runs_store.start_run(run_id, source="manual", task=body.task, cwd=body.cwd)
    row = runs_store.get_run(run_id)
    hub.publish_lifecycle(
        {"type": "started", "run_id": run_id, "task": body.task, "started_at": row["started_at"]}
    )
    # Fire-and-forget: the task runs concurrently with whatever else is
    # active, the caller gets the run_id back immediately and watches
    # progress over /ws/{run_id} or the /events roster feed.
    asyncio.create_task(_execute(run_id, body.task, body.cwd))
    return {"run_id": run_id}


async def _execute(run_id: str, task: str, cwd: str | None) -> None:
    status = "ok"
    agen = run_task(task, cwd=cwd)
    try:
        async for event in agen:
            runs_store.append_run_log(run_id, json.dumps(event))
            hub.publish_run_event(run_id, event)
            if event.get("type") == "error" or (
                event.get("type") == "result" and event.get("is_error")
            ):
                status = "error"
    finally:
        await agen.aclose()
        runs_store.finish_run(run_id, status)
        hub.publish_run_event(run_id, {"type": "run_complete", "status": status})
        hub.publish_lifecycle({"type": "finished", "run_id": run_id, "status": status})


@router.websocket("/ws/{run_id}")
async def run_ws(ws: WebSocket, run_id: str):
    """Live event stream for one specific run's detail view."""
    await ws.accept()
    q = hub.subscribe_run(run_id)
    try:
        while True:
            event = await q.get()
            await ws.send_json(event)
            if event.get("type") == "run_complete":
                break
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe_run(run_id, q)


@router.websocket("/events")
async def lifecycle_ws(ws: WebSocket):
    """Start/finish feed for the sidebar's Active/Retired roster.

    Sends a snapshot of currently-active manual runs on connect (so a
    sidebar that mounts after a run already started still sees it), then
    streams live start/finish events as they happen.
    """
    await ws.accept()
    q = hub.subscribe_lifecycle()
    try:
        for row in runs_store.list_active_runs(source="manual"):
            await ws.send_json(
                {"type": "started", "run_id": row["id"], "task": row["task"], "started_at": row["started_at"]}
            )
        while True:
            event = await q.get()
            await ws.send_json(event)
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe_lifecycle(q)
