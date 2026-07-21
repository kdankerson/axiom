# Builds the Python sidecar into src-tauri/sidecar-bin/ for a Tauri build.
# Run from the repo root: pwsh scripts/build-sidecar.ps1
#
# Onedir, not onefile — see the comment atop sidecar/build.spec for why:
# onefile's self-extracting bootloader forks a child process to run the
# actual server, so killing the one PID Tauri holds leaves that child
# (the real running server) orphaned. Onedir's exe is directly the
# interpreter, so there is only ever one process to kill.

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path "$PSScriptRoot/.."
$sidecarDir = Join-Path $repoRoot "sidecar"
$venvDir = Join-Path $sidecarDir ".venv"
$distDir = Join-Path $sidecarDir "dist"
$buildDir = Join-Path $sidecarDir "build"
$targetDir = Join-Path $repoRoot "src-tauri/sidecar-bin"

if (-not (Test-Path $venvDir)) {
    python -m venv $venvDir
}

$venvPython = Join-Path $venvDir "Scripts/python.exe"

& $venvPython -m pip install --upgrade pip -q
& $venvPython -m pip install -r (Join-Path $sidecarDir "requirements.txt") -q
& $venvPython -m pip install pyinstaller -q

if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }

Push-Location $sidecarDir
try {
    & $venvPython -m PyInstaller build.spec --distpath dist --workpath build --noconfirm
} finally {
    Pop-Location
}

if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
New-Item -ItemType Directory -Path $targetDir | Out-Null
Copy-Item -Recurse -Path (Join-Path $distDir "axiom-sidecar/*") -Destination $targetDir

Write-Host "Sidecar built at $targetDir"
