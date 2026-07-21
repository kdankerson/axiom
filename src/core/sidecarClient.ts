// In dev, the sidecar runs on a fixed port (see scripts/dev.mjs + .env.development).
// In production, Tauri spawns the sidecar and exposes its OS-assigned port via
// the `get_sidecar_port` command (wired up in M7).
const DEV_URL = import.meta.env.VITE_SIDECAR_URL as string | undefined;

export async function sidecarBaseUrl(): Promise<string> {
  if (DEV_URL) return DEV_URL;
  const { invoke } = await import("@tauri-apps/api/core");
  const port = await invoke<number>("get_sidecar_port");
  return `http://127.0.0.1:${port}`;
}

export async function sidecarFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = await sidecarBaseUrl();
  return fetch(`${base}${path}`, init);
}

export async function sidecarWsUrl(path: string): Promise<string> {
  const base = await sidecarBaseUrl();
  return `${base.replace(/^http/, "ws")}${path}`;
}
