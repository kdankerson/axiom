import { useCallback, useEffect, useRef, useState } from "react";
import { sidecarWsUrl } from "../../../src/core/sidecarClient";

export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export function useAgentStream() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const run = useCallback(async (task: string) => {
    setEvents([]);
    setRunning(true);

    const url = await sidecarWsUrl("/api/agents/run");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ task }));
    });
    ws.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "run_complete") {
        setRunning(false);
        ws.close();
        return;
      }
      setEvents((prev) => [...prev, payload]);
    });
    ws.addEventListener("error", () => {
      setEvents((prev) => [...prev, { type: "error", message: "WebSocket connection failed" }]);
      setRunning(false);
    });
    ws.addEventListener("close", () => {
      setRunning(false);
    });
  }, []);

  const cancel = useCallback(() => {
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { events, running, run, cancel };
}
