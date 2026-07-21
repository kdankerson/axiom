import json

import psutil
from fastapi import APIRouter

from core.config import resource_root

router = APIRouter()


@router.get("/status")
def status():
    modules_dir = resource_root() / "modules"
    modules = []
    if modules_dir.is_dir():
        for module_dir in sorted(modules_dir.iterdir()):
            manifest_path = module_dir / "module.json"
            if manifest_path.exists():
                modules.append(json.loads(manifest_path.read_text()))

    return {
        "sidecar": "ok",
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "modules": [
            {"id": m["id"], "name": m["name"], "placeholder": m["nav"].get("placeholder", False)}
            for m in modules
        ],
    }
