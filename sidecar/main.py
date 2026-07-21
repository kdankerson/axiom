import os
import socket

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.module_loader import discover_and_mount

app = FastAPI(title="AXIOM Sidecar")

# The frontend runs on a different origin than the sidecar (Vite dev server in
# dev, the tauri:// webview origin in production) — both are local-only, so a
# permissive policy is fine here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


DISCOVERED = discover_and_mount(app)


@app.get("/api/modules")
def list_modules():
    return DISCOVERED


def _pick_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


if __name__ == "__main__":
    dev_port = os.environ.get("AXIOM_DEV_PORT")
    port = int(dev_port) if dev_port else _pick_port()
    # Rust reads this exact line from stdout to learn which port we bound (production only).
    print(f"AXIOM_SIDECAR_PORT={port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
