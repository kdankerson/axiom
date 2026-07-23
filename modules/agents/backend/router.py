import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core import runs_store

from .cli_runner import run_task

router = APIRouter()


@router.websocket("/run")
async def agents_ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            payload = await ws.receive_json()
            task = payload.get("task", "")
            cwd = payload.get("cwd")

            run_id = str(uuid.uuid4())
            runs_store.start_run(run_id, source="manual", task=task, cwd=cwd)
            status = "ok"

            agen = run_task(task, cwd=cwd)
            try:
                async for event in agen:
                    runs_store.append_run_log(run_id, json.dumps(event))
                    if event.get("type") == "error" or (
                        event.get("type") == "result" and event.get("is_error")
                    ):
                        status = "error"
                    await ws.send_json(event)
            finally:
                await agen.aclose()
                runs_store.finish_run(run_id, status)

            await ws.send_json({"type": "run_complete", "run_id": run_id})
    except WebSocketDisconnect:
        pass
