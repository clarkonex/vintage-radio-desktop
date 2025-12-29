// Vintage Radio Desktop - Tauri Backend
use tauri::{AppHandle, Emitter, Manager};
use std::sync::{Arc, Mutex};
use tauri::async_runtime::JoinHandle; // Use Tauri's JoinHandle wrapper
use tokio::io::{AsyncReadExt, BufReader};
use tokio_util::io::StreamReader;
use futures::TryStreamExt; // Required for .map_err() on streams

// Store the handle of the current metadata thread so we can cancel it when changing stations
struct StreamState {
    handle: Mutex<Option<JoinHandle<()>>>,
}

#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
async fn start_metadata_listener(
    url: String, 
    state: tauri::State<'_, Arc<StreamState>>, 
    app: AppHandle
) -> Result<(), String> {
    // 1. Cancel the previous listener if it exists
    if let Some(handle) = state.handle.lock().unwrap().take() {
        handle.abort();
    }

    // 2. Spawn a new async task to fetch metadata
    let handle = tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();
        
        // Request with Icy-MetaData header to tell server we want metadata
        let response = match client.get(&url).header("Icy-MetaData", "1").send().await {
            Ok(res) => res,
            Err(_) => return, // Connection failed, just exit task
        };

        // Get the metadata interval (how many bytes of audio between metadata chunks)
        let icy_metaint: usize = response
            .headers()
            .get("icy-metaint")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        if icy_metaint == 0 {
            return; // No metadata supported by this stream
        }

        // Convert reqwest stream to a Tokio AsyncRead
        // We map the reqwest error to a std::io::Error so StreamReader accepts it
        let stream = response.bytes_stream()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e));
            
        let stream_reader = StreamReader::new(stream);
        let mut reader = BufReader::new(stream_reader);

        let mut buffer = vec![0u8; 4096]; // Temp buffer for skipping audio data

        loop {
            // A. Skip audio data (icy_metaint bytes)
            let mut bytes_to_skip = icy_metaint;
            while bytes_to_skip > 0 {
                let chunk_size = std::cmp::min(bytes_to_skip, buffer.len());
                // We use explicit match to help compiler type inference
                match reader.read_exact(&mut buffer[0..chunk_size]).await {
                    Ok(_) => bytes_to_skip -= chunk_size,
                    Err(_) => return, // Stream ended or error
                }
            }

            // B. Read metadata length byte
            let mut len_byte = [0u8; 1];
            if let Err(_) = reader.read_exact(&mut len_byte).await {
                return;
            }
            let meta_len = (len_byte[0] as usize) * 16;

            // C. Read metadata string
            if meta_len > 0 {
                let mut meta_buf = vec![0u8; meta_len];
                if let Err(_) = reader.read_exact(&mut meta_buf).await {
                    return;
                }

                if let Ok(meta_str) = String::from_utf8(meta_buf) {
                    // format is usually: StreamTitle='Song Name - Artist';StreamUrl='...';
                    if let Some(start) = meta_str.find("StreamTitle='") {
                        let rest = &meta_str[start + 13..];
                        if let Some(end) = rest.find("';") {
                            let title = &rest[..end];
                            if !title.trim().is_empty() {
                                let _ = app.emit("metadata-update", title);
                            }
                        }
                    }
                }
            }
        }
    });

    // Store the handle
    *state.handle.lock().unwrap() = Some(handle);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(StreamState { handle: Mutex::new(None) })) // Initialize state
        .invoke_handler(tauri::generate_handler![exit_app, start_metadata_listener])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
