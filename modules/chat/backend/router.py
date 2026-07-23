import asyncio
import uuid

from fastapi import APIRouter, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from core import memory_store
from core.fact_extraction import extract_facts

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
    session_id = str(uuid.uuid4())
    turn_count = 0
    exchanged_anything = False
    try:
        while True:
            payload = await ws.receive_json()
            message = payload.get("message", "")
            memory_store.log_chat_message(session_id, "user", message)

            resume = turn_count > 0
            system_prompt = None if resume else memory_store.recent_facts_prompt()

            full_text = ""
            try:
                async for delta in stream_reply(
                    message,
                    session_id=session_id,
                    resume=resume,
                    append_system_prompt=system_prompt,
                ):
                    full_text += delta
                    await ws.send_json({"type": "delta", "text": delta})
            except RuntimeError as err:
                await ws.send_json({"type": "error", "message": str(err)})
                continue
            finally:
                turn_count += 1
                exchanged_anything = True

            memory_store.log_chat_message(session_id, "assistant", full_text)
            await ws.send_json({"type": "done", "full_text": full_text})
    except WebSocketDisconnect:
        pass
    finally:
        if exchanged_anything:
            # Fire-and-forget: don't hold the connection open waiting on an
            # extra CLI call just to extract facts.
            asyncio.create_task(extract_facts(session_id))
