import sqlite3
import threading
from pathlib import Path

_LOCK = threading.Lock()
_CONN: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    automation_id INTEGER,
    task TEXT NOT NULL,
    cwd TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    log TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    task TEXT NOT NULL,
    cwd TEXT,
    cron TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    last_status TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def _data_dir() -> Path:
    # ~/.axiom rather than resource_root(): the install dir isn't guaranteed
    # writable (e.g. Program Files), and this data should survive upgrades/
    # reinstalls anyway.
    d = Path.home() / ".axiom"
    d.mkdir(parents=True, exist_ok=True)
    return d


def connection() -> sqlite3.Connection:
    global _CONN
    if _CONN is None:
        _CONN = sqlite3.connect(_data_dir() / "axiom.db", check_same_thread=False)
        _CONN.row_factory = sqlite3.Row
    return _CONN


def init_db() -> None:
    with _LOCK:
        connection().executescript(SCHEMA)
        connection().commit()


def execute(sql: str, params: tuple = ()) -> sqlite3.Cursor:
    with _LOCK:
        cur = connection().execute(sql, params)
        connection().commit()
        return cur


def query(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    with _LOCK:
        return connection().execute(sql, params).fetchall()


def query_one(sql: str, params: tuple = ()) -> sqlite3.Row | None:
    with _LOCK:
        return connection().execute(sql, params).fetchone()
