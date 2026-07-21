# PyInstaller spec for the AXIOM sidecar.
#
# modules/ is deliberately NOT bundled into the frozen exe (see risk #4 in the
# plan): it's copied in separately as a Tauri bundle resource and loaded at
# runtime via sys.path injection, so adding/editing a module never requires
# re-freezing the interpreter. Build with: pyinstaller sidecar/build.spec
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = (
    collect_submodules("uvicorn.protocols")
    + collect_submodules("uvicorn.loops")
    + collect_submodules("uvicorn.lifespan")
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
