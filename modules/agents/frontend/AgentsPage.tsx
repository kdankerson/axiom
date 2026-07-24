import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { petBus } from "../../../src/core/petBus";
import { sidecarFetch } from "../../../src/core/sidecarClient";
import { AgentDetail } from "./AgentDetail";

export function AgentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get("run");
  const [task, setTask] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    petBus.setMood("thinking");
    try {
      const res = await sidecarFetch("/api/agents/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { run_id } = await res.json();
      setTask("");
      setSearchParams({ run: run_id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="axiom-agents">
      <h1>Agents</h1>
      <form className="axiom-agents-input" onSubmit={handleSubmit}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe a coding task..."
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Starting…" : "Run"}
        </button>
      </form>
      {error && <p className="axiom-agents-error">{error}</p>}

      {runId ? (
        <AgentDetail key={runId} runId={runId} />
      ) : (
        <p className="axiom-memory-empty">
          Pick an agent from the sidebar, or start a new task above — each submit runs
          concurrently, so you don't have to wait for one to finish before starting another.
        </p>
      )}
    </div>
  );
}
