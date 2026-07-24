import { useEffect, useMemo, useState } from "react";
import { sidecarFetch, sidecarWsUrl } from "../../../src/core/sidecarClient";
import { BlockList, deriveBlocks, type AgentEvent } from "./blocks";

interface RunRow {
  id: string;
  task: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  log: string;
}

function parseLog(log: string): AgentEvent[] {
  return log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as AgentEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is AgentEvent => e !== null);
}

export function AgentDetail({ runId }: { runId: string }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [meta, setMeta] = useState<RunRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | undefined;
    setEvents([]);
    setMeta(null);
    setNotFound(false);

    (async () => {
      const res = await sidecarFetch(`/api/memory/runs/${runId}`);
      if (cancelled) return;
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const row: RunRow = await res.json();
      if (cancelled) return;
      setMeta(row);
      setEvents(parseLog(row.log));

      if (row.status === "running") {
        const url = await sidecarWsUrl(`/api/agents/ws/${runId}`);
        if (cancelled) return;
        ws = new WebSocket(url);
        ws.addEventListener("message", (e) => {
          const payload = JSON.parse(e.data);
          if (payload.type === "run_complete") {
            setMeta((prev) => (prev ? { ...prev, status: payload.status ?? "ok" } : prev));
            return;
          }
          setEvents((prev) => [...prev, payload]);
        });
      }
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [runId]);

  const blocks = useMemo(() => deriveBlocks(events), [events]);

  if (notFound) return <p className="axiom-agents-error">Agent not found.</p>;
  if (!meta) return <p className="axiom-memory-row-meta">Loading…</p>;

  return (
    <div className="axiom-agent-detail">
      <div className="axiom-agent-detail-header">
        <h2>{meta.task}</h2>
        <span className={`axiom-memory-status axiom-memory-status-${meta.status}`}>{meta.status}</span>
      </div>
      <BlockList blocks={blocks} />
    </div>
  );
}
