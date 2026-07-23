import importlib
import json
import sys

from fastapi import FastAPI

from .config import resource_root


def discover_and_mount(app: FastAPI) -> list[dict]:
    """Scan modules/*/module.json, mount any enabled backend routers, return all manifests."""
    root = resource_root()
    sys.path.insert(0, str(root))
    modules_dir = root / "modules"
    manifests: list[dict] = []
    if not modules_dir.is_dir():
        return manifests

    for module_dir in sorted(modules_dir.iterdir()):
        manifest_path = module_dir / "module.json"
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text())
        manifests.append(manifest)

        backend = manifest.get("backend")
        if not backend or not backend.get("enabled"):
            continue

        module_name = f"modules.{manifest['id']}.backend.router"
        mod = importlib.import_module(module_name)
        prefix = backend.get("prefix", f"/api/{manifest['id']}")
        app.include_router(mod.router, prefix=prefix, tags=[manifest["id"]])

        # Optional convention: a module's router.py may expose an async
        # start() for background work (schedulers, pollers). Registered as a
        # FastAPI startup handler rather than called here directly — at this
        # point (import time, before uvicorn.run()) there's no running event
        # loop yet, so anything that does asyncio.create_task() would attach
        # to the wrong loop and silently never run.
        if hasattr(mod, "start"):
            app.router.add_event_handler("startup", mod.start)

    return manifests
