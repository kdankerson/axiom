import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useChatStream } from "./useChatStream";
import { useVoiceInput } from "./useVoiceInput";
import { sidecarFetch } from "../../../src/core/sidecarClient";

async function speak(text: string) {
  try {
    const res = await sidecarFetch("/api/chat/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    // Voice output is best-effort — the reply is already rendered as text,
    // so a TTS failure shouldn't interrupt the conversation.
  }
}

export function ChatWindow() {
  const { messages, streaming, error, sendMessage } = useChatStream();
  const [input, setInput] = useState("");
  const spokenCountRef = useRef(0);

  const { listening, supported, start, stop } = useVoiceInput((text) => {
    void sendMessage(text);
  });

  useEffect(() => {
    if (streaming || messages.length === 0) return;
    if (messages.length <= spokenCountRef.current) return;
    const last = messages[messages.length - 1];
    spokenCountRef.current = messages.length;
    if (last.role === "assistant" && last.text) void speak(last.text);
  }, [streaming, messages]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  }

  return (
    <div className="axiom-chat">
      <h1>Chat</h1>
      <div className="axiom-chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`axiom-chat-msg axiom-chat-msg-${m.role}`}>
            {m.text || (streaming && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
      </div>
      {error && <p className="axiom-chat-error">error: {error}</p>}
      <form className="axiom-chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message AXIOM..."
        />
        {supported && (
          <button type="button" onClick={listening ? stop : start}>
            {listening ? "Stop" : "Mic"}
          </button>
        )}
        <button type="submit" disabled={streaming}>
          Send
        </button>
      </form>
    </div>
  );
}
