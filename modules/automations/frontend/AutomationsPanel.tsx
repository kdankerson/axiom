import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { sidecarFetch } from "../../../src/core/sidecarClient";

interface Automation {
  id: number;
  name: string;
  task: string;
  cwd: string | null;
  cron: string;
  enabled: number;
  last_run_at: string | null;
  last_status: string | null;
}

interface Run {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
}

const emptyForm = { name: "", task: "", cwd: "", cron: "0 8 * * *" };

export function AutomationsPanel() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const res = await sidecarFetch("/api/automations/");
    setAutomations(await res.json());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await sidecarFetch("/api/automations/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        task: form.task,
        cwd: form.cwd || null,
        cron: form.cron,
        enabled: true,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(body.detail ?? `Request failed (${res.status})`);
      return;
    }
    setForm(emptyForm);
    await refresh();
  }

  async function toggleEnabled(a: Automation) {
    await sidecarFetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: a.enabled ? false : true }),
    });
    await refresh();
  }

  async function remove(id: number) {
    await sidecarFetch(`/api/automations/${id}`, { method: "DELETE" });
    if (openId === id) setOpenId(null);
    await refresh();
  }

  async function toggleOpen(a: Automation) {
    if (openId === a.id) {
      setOpenId(null);
      return;
    }
    const res = await sidecarFetch(`/api/automations/${a.id}/runs`);
    setRuns(await res.json());
    setOpenId(a.id);
  }

  return (
    <div className="axiom-automations">
      <h1>Automations</h1>

      <form className="axiom-automations-form" onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Task prompt (same as an Agents task)"
          value={form.task}
          onChange={(e) => setForm({ ...form, task: e.target.value })}
          required
        />
        <input
          placeholder="Working directory (optional)"
          value={form.cwd}
          onChange={(e) => setForm({ ...form, cwd: e.target.value })}
        />
        <input
          placeholder="Cron schedule, e.g. 0 8 * * *"
          value={form.cron}
          onChange={(e) => setForm({ ...form, cron: e.target.value })}
          required
        />
        <button type="submit">Create</button>
      </form>
      {formError && <p className="axiom-automations-error">{formError}</p>}

      {automations.length === 0 && (
        <p className="axiom-memory-empty">No automations yet — create one above.</p>
      )}

      <ul className="axiom-memory-list">
        {automations.map((a) => (
          <li key={a.id}>
            <div className="axiom-automations-row">
              <button className="axiom-memory-row" onClick={() => void toggleOpen(a)}>
                <span>
                  {a.name} — <code>{a.cron}</code>
                </span>
                <span className="axiom-memory-row-meta">
                  {a.last_run_at
                    ? `last run ${new Date(a.last_run_at + "Z").toLocaleString()} (${a.last_status})`
                    : "never run"}
                </span>
              </button>
              <button onClick={() => void toggleEnabled(a)}>{a.enabled ? "Disable" : "Enable"}</button>
              <button onClick={() => void remove(a.id)}>Delete</button>
            </div>
            {openId === a.id && (
              <div className="axiom-memory-detail">
                <p className="axiom-memory-row-meta">{a.task}</p>
                {runs.length === 0 && <p className="axiom-memory-row-meta">No runs yet.</p>}
                <ul className="axiom-memory-list">
                  {runs.map((r) => (
                    <li key={r.id} className="axiom-memory-row">
                      <span>{new Date(r.started_at + "Z").toLocaleString()}</span>
                      <span className={`axiom-memory-status axiom-memory-status-${r.status}`}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
