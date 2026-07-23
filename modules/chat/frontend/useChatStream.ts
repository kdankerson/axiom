import { useCallback, useEffect, useRef, useState } from "react";
import { petBus } from "../../../src/core/petBus";
import { sidecarWsUrl } from "../../../src/core/sidecarClient";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(async (): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    const url = await sidecarWsUrl("/api/chat/ws");
    const ws = new WebSocket(url);
    wsRef.current = ws;
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener(
        "error",
        () => reject(new Error("Could not connect to sidecar chat socket")),
        { once: true },
      );
    });
    return ws;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);
      setStreaming(true);
      petBus.setMood("thinking");

      let ws: WebSocket;
      try {
        ws = await connect();
      } catch (err) {
        setError((err as Error).message);
        setStreaming(false);
        petBus.setMood("concerned");
        return;
      }

      const onMessage = (event: MessageEvent) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "delta") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { role: "assistant", text: last.text + payload.text };
            return next;
          });
        } else if (payload.type === "done") {
          setStreaming(false);
          petBus.setMood("happy");
          ws.removeEventListener("message", onMessage);
        } else if (payload.type === "error") {
          setError(payload.message);
          setStreaming(false);
          petBus.setMood("concerned");
          ws.removeEventListener("message", onMessage);
        }
      };
      ws.addEventListener("message", onMessage);
      ws.send(JSON.stringify({ message: text }));
    },
    [connect],
  );

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { messages, streaming, error, sendMessage };
}
