from fastapi import APIRouter, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .claude_client import stream_reply
from .tts import synthesize

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
async def speak(req: SpeakRequest):
    try:
        audio = await synthesize(req.text)
    except Exception:
        # edge-tts is an unofficial endpoint that can fail unpredictably
        # (network, cert, rate limit) — voice output is best-effort, so
        # degrade to silence rather than a raw 500 with a stack trace.
        return Response(status_code=502)
    return Response(content=audio, media_type="audio/mpeg")


@router.websocket("/ws")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            payload = await ws.receive_json()
            message = payload.get("message", "")
            full_text = ""
            try:
                async for delta in stream_reply(message):
                    full_text += delta
                    await ws.send_json({"type": "delta", "text": delta})
            except RuntimeError as err:
                await ws.send_json({"type": "error", "message": str(err)})
                continue
            await ws.send_json({"type": "done", "full_text": full_text})
    except WebSocketDisconnect:
        pass
