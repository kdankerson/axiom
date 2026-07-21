import { useState } from "react";
import { sidecarFetch } from "../core/sidecarClient";

export function Home() {
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
    <>
      <h1>AXIOM</h1>
      <button onClick={ping}>Ping sidecar</button>
      <p>{status}</p>
    </>
  );
}
