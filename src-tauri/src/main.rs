// The Tauri shell launches the Python/FastAPI backend as a child process and serves the Next.js static export
// Key structure:
// - On startup: spawn FastAPI backend subprocess
// - Poll /api/health until it responds 200
// - Tauri serves the frontend from the static export
// - On exit: kill the backend subprocess

#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::RunEvent;

fn main() {
    // Spawn FastAPI backend subprocess
    let child = Command::new("python")
        .args(["-m", "uvicorn", "backend.main:app", "--port", "8420", "--host", "127.0.0.1"])
        .spawn();

    let backend_process = match child {
        Ok(c) => Arc::new(Mutex::new(Some(c))),
        Err(e) => {
            eprintln!("Failed to start FastAPI backend: {}", e);
            // In a real app we might show a dialog here, but we continue 
            // for now to at least let Tauri start up.
            Arc::new(Mutex::new(None))
        }
    };

    let process_to_kill = backend_process.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // Wait for the backend to be healthy using tauri::async_runtime
            tauri::async_runtime::spawn(async move {
                let mut is_healthy = false;
                for _ in 0..30 { // wait up to 15 seconds
                    // Using basic TCP connect as a proxy for health since reqwest isn't in Cargo.toml
                    if std::net::TcpStream::connect("127.0.0.1:8420").is_ok() {
                        is_healthy = true;
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                
                if !is_healthy {
                    eprintln!("Warning: Backend did not become healthy in time.");
                } else {
                    println!("Backend is healthy and ready.");
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, event| {
            // On app exit: kill the FastAPI subprocess
            if let RunEvent::Exit = event {
                if let Ok(mut lock) = process_to_kill.lock() {
                    if let Some(mut p) = lock.take() {
                        let _ = p.kill();
                        println!("Backend process killed on exit.");
                    }
                }
            }
        });
}
