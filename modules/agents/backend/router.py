from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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

            agen = run_task(task, cwd=cwd)
            try:
                async for event in agen:
                    await ws.send_json(event)
            finally:
                await agen.aclose()

            await ws.send_json({"type": "run_complete"})
    except WebSocketDisconnect:
        pass
