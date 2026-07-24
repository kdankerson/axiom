"""In-memory pub/sub layered on top of the persisted `runs` table.

The table is the source of truth for run state; this just fans out live
events to whichever websockets happen to be attached right now — a run's
detail view (per-run event stream) and the sidebar's roster (start/finish
lifecycle stream), and there can be zero or several of either at once since
multiple agents run concurrently and any of them can be watched from
multiple windows.
"""

import asyncio


class RunHub:
    def __init__(self) -> None:
        self._run_subscribers: dict[str, list[asyncio.Queue]] = {}
        self._lifecycle_subscribers: list[asyncio.Queue] = []

    def subscribe_run(self, run_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._run_subscribers.setdefault(run_id, []).append(q)
        return q

    def unsubscribe_run(self, run_id: str, q: asyncio.Queue) -> None:
        subs = self._run_subscribers.get(run_id)
        if subs and q in subs:
            subs.remove(q)
            if not subs:
                del self._run_subscribers[run_id]

    def publish_run_event(self, run_id: str, event: dict) -> None:
        for q in self._run_subscribers.get(run_id, []):
            q.put_nowait(event)

    def subscribe_lifecycle(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._lifecycle_subscribers.append(q)
        return q

    def unsubscribe_lifecycle(self, q: asyncio.Queue) -> None:
        if q in self._lifecycle_subscribers:
            self._lifecycle_subscribers.remove(q)

    def publish_lifecycle(self, event: dict) -> None:
        for q in self._lifecycle_subscribers:
            q.put_nowait(event)


hub = RunHub()
