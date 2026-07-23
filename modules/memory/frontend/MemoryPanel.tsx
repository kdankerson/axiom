import { useEffect, useState } from "react";
import { sidecarFetch } from "../../../src/core/sidecarClient";

interface ChatSession {
  session_id: string;
  started_at: string;
  last_at: string;
  message_count: number;
}

interface ChatMessage {
  role: string;
  text: string;
  created_at: string;
}

interface Run {
  id: string;
  source: string;
  automation_id: number | null;
  task: string;
  cwd: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
}

interface Fact {
  id: number;
  text: string;
  source: string;
  created_at: string;
}

type Tab = "history" | "facts";

export function MemoryPanel() {
  const [tab, setTab] = useState<Tab>("history");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [openRun, setOpenRun] = useState<Run | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const [sessionsRes, runsRes, factsRes] = await Promise.all([
      sidecarFetch("/api/memory/chat-sessions"),
      sidecarFetch("/api/memory/runs"),
      sidecarFetch("/api/memory/facts"),
    ]);
    setSessions(await sessionsRes.json());
    setRuns(await runsRes.json());
    setFacts(await factsRes.json());
  }

  async function openChatSession(sessionId: string) {
    if (openSession === sessionId) {
      setOpenSession(null);
      return;
    }
    const res = await sidecarFetch(`/api/memory/chat-sessions/${sessionId}`);
    setSessionMessages(await res.json());
    setOpenSession(sessionId);
  }

  function toggleRun(run: Run) {
    setOpenRun(openRun?.id === run.id ? null : run);
  }

  async function removeFact(id: number) {
    await sidecarFetch(`/api/memory/facts/${id}`, { method: "DELETE" });
    setFacts((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="axiom-memory">
      <h1>Memory</h1>
      <div className="axiom-memory-tabs">
        <button
          className={tab === "history" ? "axiom-tab-active" : ""}
          onClick={() => setTab("history")}
        >
          History
        </button>
        <button className={tab === "facts" ? "axiom-tab-active" : ""} onClick={() => setTab("facts")}>
          Facts ({facts.length})
        </button>
      </div>

      {tab === "history" && (
        <div className="axiom-memory-history">
          <section>
            <h2>Chat sessions</h2>
            {sessions.length === 0 && <p className="axiom-memory-empty">No chat sessions yet.</p>}
            <ul className="axiom-memory-list">
              {sessions.map((s) => (
                <li key={s.session_id}>
                  <button className="axiom-memory-row" onClick={() => void openChatSession(s.session_id)}>
                    <span>{new Date(s.started_at + "Z").toLocaleString()}</span>
                    <span className="axiom-memory-row-meta">{s.message_count} messages</span>
                  </button>
                  {openSession === s.session_id && (
                    <div className="axiom-memory-detail">
                      {sessionMessages.map((m, i) => (
                        <p key={i} className={`axiom-memory-msg axiom-memory-msg-${m.role}`}>
                          <strong>{m.role}:</strong> {m.text}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Runs</h2>
            {runs.length === 0 && <p className="axiom-memory-empty">No agent or automation runs yet.</p>}
            <ul className="axiom-memory-list">
              {runs.map((r) => (
                <li key={r.id}>
                  <button className="axiom-memory-row" onClick={() => toggleRun(r)}>
                    <span>
                      [{r.source}] {r.task}
                    </span>
                    <span className={`axiom-memory-status axiom-memory-status-${r.status}`}>{r.status}</span>
                  </button>
                  {openRun?.id === r.id && (
                    <div className="axiom-memory-detail">
                      <p className="axiom-memory-row-meta">
                        started {new Date(r.started_at + "Z").toLocaleString()}
                        {r.finished_at && ` — finished ${new Date(r.finished_at + "Z").toLocaleString()}`}
                      </p>
                      <RunLog runId={r.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "facts" && (
        <div className="axiom-memory-facts">
          {facts.length === 0 && (
            <p className="axiom-memory-empty">
              Nothing remembered yet — facts are extracted automatically after chat sessions.
            </p>
          )}
          <ul className="axiom-memory-list">
            {facts.map((f) => (
              <li key={f.id} className="axiom-memory-row">
                <span>{f.text}</span>
                <button onClick={() => void removeFact(f.id)}>Forget</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RunLog({ runId }: { runId: string }) {
  const [log, setLog] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void sidecarFetch(`/api/memory/runs/${runId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLog(data.log ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (log === null) return <p className="axiom-memory-row-meta">Loading log...</p>;
  return <pre className="axiom-memory-log">{log || "(no output recorded)"}</pre>;
}
