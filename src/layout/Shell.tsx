import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { sidecarFetch } from "../core/sidecarClient";

export function Shell() {
  const [status, setStatus] = useState<string>("not checked");

  async function ping() {
    setStatus("checking...");
    try {
      const res = await sidecarFetch("/health");
      const body = await res.json();
      setStatus(`sidecar: ${body.status}`);
    } catch (err) {
      setStatus(`error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="axiom-shell">
      <Sidebar />
      <main className="axiom-main">
        <h1>AXIOM</h1>
        <button onClick={ping}>Ping sidecar</button>
        <p>{status}</p>
      </main>
    </div>
  );
}
