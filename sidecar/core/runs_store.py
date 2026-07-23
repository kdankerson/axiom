"""Shared `runs` table — a run is one `claude` CLI execution, triggered either
manually from the Agents module or on a schedule from Automations."""

from . import db as _db


def start_run(
    run_id: str,
    *,
    source: str,
    task: str,
    cwd: str | None = None,
    automation_id: int | None = None,
) -> None:
    _db.execute(
        "INSERT INTO runs (id, source, automation_id, task, cwd, status) "
        "VALUES (?, ?, ?, ?, ?, 'running')",
        (run_id, source, automation_id, task, cwd),
    )


def append_run_log(run_id: str, line: str) -> None:
    _db.execute("UPDATE runs SET log = log || ? WHERE id = ?", (line + "\n", run_id))


def finish_run(run_id: str, status: str) -> None:
    _db.execute(
        "UPDATE runs SET status = ?, finished_at = datetime('now') WHERE id = ?",
        (status, run_id),
    )


def list_runs(limit: int = 100, automation_id: int | None = None) -> list[dict]:
    if automation_id is not None:
        rows = _db.query(
            "SELECT id, source, automation_id, task, cwd, status, started_at, finished_at "
            "FROM runs WHERE automation_id = ? ORDER BY started_at DESC LIMIT ?",
            (automation_id, limit),
        )
    else:
        rows = _db.query(
            "SELECT id, source, automation_id, task, cwd, status, started_at, finished_at "
            "FROM runs ORDER BY started_at DESC LIMIT ?",
            (limit,),
        )
    return [dict(r) for r in rows]


def get_run(run_id: str) -> dict | None:
    row = _db.query_one("SELECT * FROM runs WHERE id = ?", (run_id,))
    return dict(row) if row else None
