use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::{watch, Mutex};

pub struct SidecarState {
    port_rx: watch::Receiver<Option<u16>>,
    port_tx: watch::Sender<Option<u16>>,
    child: Mutex<Option<CommandChild>>,
    shutting_down: Mutex<bool>,
}

impl SidecarState {
    pub fn new() -> Self {
        let (port_tx, port_rx) = watch::channel(None);
        Self {
            port_rx,
            port_tx,
            child: Mutex::new(None),
            shutting_down: Mutex::new(false),
        }
    }
}

/// Spawns the sidecar and keeps it running, restarting with backoff if it
/// crashes unexpectedly. Call once from `setup()`.
pub fn spawn_sidecar(app: &AppHandle) {
    if cfg!(debug_assertions) {
        // Dev mode spawns the sidecar itself via scripts/dev.mjs on a fixed
        // port instead — see .env.development / src/core/sidecarClient.ts.
        return;
    }

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut attempt: u32 = 0;
        loop {
            {
                let state = app.state::<SidecarState>();
                if *state.shutting_down.lock().await {
                    return;
                }
            }

            if let Err(err) = run_once(&app).await {
                eprintln!("sidecar error: {err}");
            }

            {
                let state = app.state::<SidecarState>();
                let _ = state.port_tx.send(None);
                *state.child.lock().await = None;
                if *state.shutting_down.lock().await {
                    return;
                }
            }

            if attempt >= 3 {
                eprintln!("sidecar crashed {attempt} times in a row, giving up on restarts");
                return;
            }
            attempt += 1;
            tokio::time::sleep(Duration::from_secs(1 << attempt)).await; // 2s, 4s, 8s
        }
    });
}

async fn run_once(app: &AppHandle) -> Result<(), tauri_plugin_shell::Error> {
    let resource_dir = app.path().resource_dir().map_err(|e| {
        tauri_plugin_shell::Error::Io(std::io::Error::other(e.to_string()))
    })?;

    // A plain resource + generic command, not externalBin/.sidecar() — see
    // the comment atop sidecar/build.spec for why onedir mode needs this.
    let exe_name = if cfg!(windows) {
        "axiom-sidecar.exe"
    } else {
        "axiom-sidecar"
    };
    let bin_path = resource_dir.join("sidecar-bin").join(exe_name);

    let (mut rx, child) = app
        .shell()
        .command(bin_path)
        .env("AXIOM_RESOURCE_DIR", resource_dir.to_string_lossy().to_string())
        .spawn()?;

    let state = app.state::<SidecarState>();
    *state.child.lock().await = Some(child);

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes);
                if let Some(port_str) = line.trim().strip_prefix("AXIOM_SIDECAR_PORT=") {
                    if let Ok(port) = port_str.parse::<u16>() {
                        let _ = state.port_tx.send(Some(port));
                    }
                }
            }
            CommandEvent::Stderr(bytes) => {
                eprint!("[sidecar] {}", String::from_utf8_lossy(&bytes));
            }
            CommandEvent::Terminated(payload) => {
                eprintln!("sidecar terminated: {:?}", payload.code);
                break;
            }
            CommandEvent::Error(err) => {
                eprintln!("sidecar spawn error: {err}");
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_sidecar_port(app: AppHandle) -> Result<u16, String> {
    let mut rx = app.state::<SidecarState>().port_rx.clone();
    loop {
        if let Some(port) = *rx.borrow() {
            return Ok(port);
        }
        rx.changed().await.map_err(|e| e.to_string())?;
    }
}

/// Stops the restart loop and explicitly kills the running sidecar. Called
/// both from the normal `RunEvent::ExitRequested` path and from a SIGINT/
/// SIGTERM handler — a bare OS-level termination signal bypasses Tauri's
/// window-close event chain entirely (verified: without this, killing the
/// process directly left the sidecar running as an orphan), so we can't
/// rely solely on the shell plugin's own window-driven exit cleanup.
pub async fn stop_and_kill(app: &AppHandle) {
    let state = app.state::<SidecarState>();
    *state.shutting_down.lock().await = true;
    let child = state.child.lock().await.take();
    if let Some(child) = child {
        let _ = child.kill();
    }
}
