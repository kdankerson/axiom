# PyInstaller spec for the AXIOM sidecar.
#
# Onedir (not onefile): onefile's bootloader self-extracts to a temp dir by
# forking a child process to run the actual interpreter, so `CommandChild::
# kill()` — which only signals the process Rust directly spawned — kills the
# bootloader stub but leaves that child (the real running server) orphaned.
# Verified against this build: onefile left a live `axiom-sidecar` process
# behind even on a normal, successful shutdown. Onedir's exe *is* the
# interpreter (no self-extraction, no forked child), so killing the one PID
# Rust holds actually stops the server. The tradeoff is that onedir's exe
# needs its sibling "_internal" folder, so it's shipped as a plain Tauri
# resource (bundle.resources) and launched via a generic shell Command
# rather than as an externalBin sidecar — see src-tauri/src/sidecar.rs.
#
# modules/ is deliberately NOT bundled into the frozen exe (see risk #4 in the
# plan): it's copied in separately as a Tauri bundle resource and loaded at
# runtime via sys.path injection, so adding/editing a module never requires
# re-freezing the interpreter. Build with: pyinstaller sidecar/build.spec
#
# Because modules/ is external and unanalyzable by PyInstaller, anything a
# module imports that main.py itself never references — sidecar/core helpers,
# or third-party packages like psutil/edge_tts used by only one module's
# backend — is invisible to PyInstaller's static analysis and must be listed
# here explicitly. When a new module needs a new package, add it below too.
import sys

from PyInstaller.utils.hooks import collect_submodules

# collect_submodules("core") needs `core` importable right now, at spec-parse
# time — PyInstaller's own entry point controls sys.path here, not our cwd.
sys.path.insert(0, SPECPATH)  # noqa: F821 — SPECPATH is injected by PyInstaller

hiddenimports = (
    collect_submodules("uvicorn.protocols")
    + collect_submodules("uvicorn.loops")
    + collect_submodules("uvicorn.lifespan")
    + collect_submodules("core")
    + ["psutil", "edge_tts"]
)

a = Analysis(
    ["main.py"],
    pathex=["."],
    binaries=[],
    datas=[],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="axiom-sidecar",
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="axiom-sidecar",
)
