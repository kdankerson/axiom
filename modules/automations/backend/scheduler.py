"""Polls enabled automations every 30s and fires any whose cron schedule has
come due, reusing the same claude_cli.stream_query the Agents module uses —
an automation is just an Agents task triggered by a clock instead of a click.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from croniter import croniter

from core import runs_store
from core.claude_cli import stream_query

from . import store

logger = logging.getLogger("axiom.automations")

POLL_SECONDS = 30

_task: asyncio.Task | None = None
_next_run: dict[int, datetime] = {}


async def _run_automation(automation: dict) -> None:
    run_id = str(uuid.uuid4())
    runs_store.start_run(
        run_id,
        source="automation",
        task=automation["task"],
        cwd=automation["cwd"],
        automation_id=automation["id"],
    )
    status = "ok"
    try:
        async for event in stream_query(automation["task"], cwd=automation["cwd"]):
            runs_store.append_run_log(run_id, json.dumps(event))
            if event.get("type") == "error" or (
                event.get("type") == "result" and event.get("is_error")
            ):
                status = "error"
    except Exception:
        logger.exception("automation %s failed", automation["id"])
        status = "error"
    finally:
        runs_store.finish_run(run_id, status)
        store.mark_run(automation["id"], status)


async def _tick() -> None:
    now = datetime.now(timezone.utc)
    enabled = store.list_enabled_automations()
    enabled_ids = {a["id"] for a in enabled}

    for stale_id in [aid for aid in _next_run if aid not in enabled_ids]:
        del _next_run[stale_id]

    for automation in enabled:
        aid = automation["id"]
        if aid not in _next_run:
            _next_run[aid] = croniter(automation["cron"], now).get_next(datetime)
            continue
        if now >= _next_run[aid]:
            asyncio.create_task(_run_automation(automation))
            _next_run[aid] = croniter(automation["cron"], now).get_next(datetime)


async def _loop() -> None:
    while True:
        try:
            await _tick()
        except Exception:
            logger.exception("automations scheduler tick failed")
        await asyncio.sleep(POLL_SECONDS)


def start() -> None:
    global _task
    if _task is None:
        _task = asyncio.create_task(_loop())
