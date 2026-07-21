mod sidecar;

use sidecar::SidecarState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState::new())
        .invoke_handler(tauri::generate_handler![sidecar::get_sidecar_port])
        .setup(|app| {
            let app_handle = app.handle().clone();
            sidecar::spawn_sidecar(&app_handle);

            // A bare OS termination signal (SIGTERM, or Windows' console
            // close/shutdown events) bypasses Tauri's window-close event
            // chain entirely, so it never reaches the RunEvent handler
            // below. Route it through app.exit() instead, which drives the
            // same clean-exit sequence as closing the window normally.
            let ctrlc_handle = app_handle.clone();
            ctrlc::set_handler(move || {
                ctrlc_handle.exit(0);
            })
            .expect("failed to register termination signal handler");

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    sidecar::stop_and_kill(&app_handle).await;
                });
            }
        });
}
