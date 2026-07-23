import { useCallback, useEffect, useRef, useState } from "react";
import { petBus } from "../../../src/core/petBus";
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
    petBus.setMood("thinking");
    let hadError = false;

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
        petBus.setMood(hadError ? "concerned" : "happy");
        ws.close();
        return;
      }
      if (payload.type === "error" || (payload.type === "result" && payload.is_error)) {
        hadError = true;
      }
      setEvents((prev) => [...prev, payload]);
    });
    ws.addEventListener("error", () => {
      setEvents((prev) => [...prev, { type: "error", message: "WebSocket connection failed" }]);
      setRunning(false);
      petBus.setMood("concerned");
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
