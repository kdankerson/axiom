from croniter import CroniterBadCronError, croniter
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core import runs_store

from . import scheduler, store

router = APIRouter()


def _validate_cron(expr: str) -> None:
    try:
        croniter(expr)
    except CroniterBadCronError as err:
        raise HTTPException(400, f"invalid cron expression: {err}") from err


class AutomationIn(BaseModel):
    name: str
    task: str
    cwd: str | None = None
    cron: str
    enabled: bool = True


class AutomationPatch(BaseModel):
    name: str | None = None
    task: str | None = None
    cwd: str | None = None
    cron: str | None = None
    enabled: bool | None = None


@router.get("/")
def list_automations():
    return store.list_automations()


@router.post("/")
def create_automation(body: AutomationIn):
    _validate_cron(body.cron)
    automation_id = store.create_automation(body.name, body.task, body.cwd, body.cron, body.enabled)
    return {"id": automation_id}


@router.patch("/{automation_id}")
def patch_automation(automation_id: int, body: AutomationPatch):
    if store.get_automation(automation_id) is None:
        raise HTTPException(404, "automation not found")
    fields = body.model_dump(exclude_unset=True)
    if "cron" in fields:
        _validate_cron(fields["cron"])
    if "enabled" in fields:
        fields["enabled"] = 1 if fields["enabled"] else 0
    store.update_automation(automation_id, **fields)
    return {"ok": True}


@router.delete("/{automation_id}")
def remove_automation(automation_id: int):
    store.delete_automation(automation_id)
    return {"ok": True}


@router.get("/{automation_id}/runs")
def automation_runs(automation_id: int):
    return runs_store.list_runs(automation_id=automation_id)


async def start() -> None:
    scheduler.start()
