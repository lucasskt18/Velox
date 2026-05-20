mod audio;

use audio::{AudioCapture, list_input_devices};
use std::sync::Mutex;
use tauri::{AppHandle, State};

struct AppState {
    audio: Mutex<AudioCapture>,
}

#[tauri::command]
fn get_input_devices() -> Result<Vec<String>, String> {
    list_input_devices()
}

#[tauri::command]
fn start_audio_capture(
    app: AppHandle,
    state: State<'_, AppState>,
    device_name: Option<String>,
) -> Result<(), String> {
    let mut audio = state
        .audio
        .lock()
        .map_err(|_| "audio engine lock poisoned".to_string())?;

    audio.start(app, device_name)
}

#[tauri::command]
fn stop_audio_capture(state: State<'_, AppState>) -> Result<(), String> {
    let mut audio = state
        .audio
        .lock()
        .map_err(|_| "audio engine lock poisoned".to_string())?;

    audio.stop();
    Ok(())
}

#[tauri::command]
fn is_audio_capturing(state: State<'_, AppState>) -> Result<bool, String> {
    let audio = state
        .audio
        .lock()
        .map_err(|_| "audio engine lock poisoned".to_string())?;

    Ok(audio.is_running())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            audio: Mutex::new(AudioCapture::default()),
        })
        .invoke_handler(tauri::generate_handler![
            get_input_devices,
            start_audio_capture,
            stop_audio_capture,
            is_audio_capturing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
