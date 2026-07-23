from core import db as _db


def create_automation(name: str, task: str, cwd: str | None, cron: str, enabled: bool) -> int:
    cur = _db.execute(
        "INSERT INTO automations (name, task, cwd, cron, enabled) VALUES (?, ?, ?, ?, ?)",
        (name, task, cwd, cron, 1 if enabled else 0),
    )
    return cur.lastrowid


def list_automations() -> list[dict]:
    rows = _db.query("SELECT * FROM automations ORDER BY id DESC")
    return [dict(r) for r in rows]


def list_enabled_automations() -> list[dict]:
    rows = _db.query("SELECT * FROM automations WHERE enabled = 1")
    return [dict(r) for r in rows]


def get_automation(automation_id: int) -> dict | None:
    row = _db.query_one("SELECT * FROM automations WHERE id = ?", (automation_id,))
    return dict(row) if row else None


def update_automation(automation_id: int, **fields) -> None:
    if not fields:
        return
    cols = ", ".join(f"{k} = ?" for k in fields)
    _db.execute(f"UPDATE automations SET {cols} WHERE id = ?", (*fields.values(), automation_id))


def delete_automation(automation_id: int) -> None:
    _db.execute("DELETE FROM automations WHERE id = ?", (automation_id,))


def mark_run(automation_id: int, status: str) -> None:
    _db.execute(
        "UPDATE automations SET last_run_at = datetime('now'), last_status = ? WHERE id = ?",
        (status, automation_id),
    )
