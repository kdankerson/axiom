import { useEffect, useRef, useState } from "react";
import { petBus } from "./petBus";
import { sidecarWsUrl } from "./sidecarClient";
import { PULSE_MS } from "../pet/usePetMood";

export interface AgentRosterEntry {
  runId: string;
  task: string;
  status: "running" | "ok" | "error";
  startedAt: string;
}

// Owned by the always-mounted Sidebar so the Active/Retired lists (and the
// pet's reaction to them) work from anywhere in the app, not just while
// looking at the Agents page.
export function useAgentRoster() {
  const [agents, setAgents] = useState<Record<string, AgentRosterEntry>>({});
  const activeCount = useRef(0);

  useEffect(() => {
    let ws: WebSocket | undefined;
    let cancelled = false;

    (async () => {
      const url = await sidecarWsUrl("/api/agents/events");
      if (cancelled) return;
      ws = new WebSocket(url);

      ws.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === "started") {
          activeCount.current += 1;
          if (activeCount.current === 1) petBus.setMood("thinking");
          setAgents((prev) => ({
            ...prev,
            [payload.run_id]: {
              runId: payload.run_id,
              task: payload.task,
              status: "running",
              startedAt: payload.started_at,
            },
          }));
        } else if (payload.type === "finished") {
          activeCount.current = Math.max(0, activeCount.current - 1);
          petBus.setMood(payload.status === "error" ? "concerned" : "happy");
          if (activeCount.current > 0) {
            // Other agents are still running underneath this one's pulse —
            // re-assert "thinking" right as the pulse would otherwise
            // revert to idle, so the mascot doesn't look done too early.
            const stillActive = activeCount;
            setTimeout(() => {
              if (stillActive.current > 0) petBus.setMood("thinking");
            }, PULSE_MS + 100);
          }
          setAgents((prev) => {
            const existing = prev[payload.run_id];
            if (!existing) return prev;
            return { ...prev, [payload.run_id]: { ...existing, status: payload.status } };
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, []);

  const list = Object.values(agents).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return {
    active: list.filter((a) => a.status === "running"),
    retired: list.filter((a) => a.status !== "running"),
  };
}
