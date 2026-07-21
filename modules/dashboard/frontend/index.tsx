import { useEffect, useState } from "react";
import { sidecarFetch } from "../../../src/core/sidecarClient";

interface DashboardStatus {
  sidecar: string;
  cpu_percent: number;
  memory_percent: number;
  modules: { id: string; name: string; placeholder: boolean }[];
}

export default function DashboardModule() {
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await sidecarFetch("/api/dashboard/status");
        const body: DashboardStatus = await res.json();
        if (!cancelled) {
          setStatus(body);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error) return <p>error: {error}</p>;
  if (!status) return <p>loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Sidecar: {status.sidecar}</p>
      <p>CPU: {status.cpu_percent}%</p>
      <p>Memory: {status.memory_percent}%</p>
      <h2>Modules</h2>
      <ul>
        {status.modules.map((m) => (
          <li key={m.id}>
            {m.name} {m.placeholder ? "(placeholder)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
