import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === "win32";
const venvPython = path.join(root, ".venv", isWin ? "Scripts/python.exe" : "bin/python");

const sidecar = spawn(venvPython, ["sidecar/main.py"], {
  cwd: root,
  env: { ...process.env, AXIOM_DEV_PORT: "8756" },
  stdio: "inherit",
});

// Windows can't CreateProcess a .cmd file directly — it has to go through a
// shell. Without this, spawn() fails with EINVAL (or ENOENT on older Node).
const tauri = spawn(isWin ? "npm.cmd" : "npm", ["run", "tauri", "--", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
});

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  sidecar.kill();
  tauri.kill();
  process.exit(code ?? 0);
}

tauri.on("exit", (code) => shutdown(code));
sidecar.on("exit", (code) => {
  if (!shuttingDown) console.error(`[dev] sidecar exited unexpectedly with code ${code}`);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
