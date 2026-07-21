# AXIOM

Extensible desktop AI shell. Windows-first, Tauri + React + Python sidecar.

A sci-fi/JARVIS-style dashboard app — not an OS, kernel, or distro. Modules
(Chat, Agents, Dashboard, ...) live as self-contained folders under `modules/`
and are auto-discovered by both the React frontend and the Python sidecar;
no central registry file needs editing to add one.

## Dev prerequisites

- Node.js + npm
- Rust + Cargo
- Python 3.11+
- Linux dev only: `webkit2gtk-4.1` and `librsvg2` (see
  https://tauri.app/start/prerequisites/#linux)

## Dev

```
npm install
npm run dev        # runs Vite + sidecar + tauri dev concurrently
```
