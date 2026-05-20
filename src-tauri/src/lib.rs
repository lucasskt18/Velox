mod audio;
mod models;
mod transcription;

use audio::{AudioCapture, list_input_devices};
use models::get_whisper_model_status;
use std::sync::Mutex;
use transcription::TranscriptionEngine;
use tauri::{AppHandle, State};

struct AppState {
    audio: Mutex<AudioCapture>,
    transcription: Mutex<TranscriptionEngine>,
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
    let chunk_tx = {
        let mut transcription = state
            .transcription
            .lock()
            .map_err(|_| "transcription engine lock poisoned".to_string())?;

        transcription.start(app.clone())?
    };

    let mut audio = state
        .audio
        .lock()
        .map_err(|_| "audio engine lock poisoned".to_string())?;

    audio.start(app, device_name, Some(chunk_tx))
}

#[tauri::command]
fn stop_audio_capture(state: State<'_, AppState>) -> Result<(), String> {
    {
        let mut audio = state
            .audio
            .lock()
            .map_err(|_| "audio engine lock poisoned".to_string())?;
        audio.stop();
    }

    let mut transcription = state
        .transcription
        .lock()
        .map_err(|_| "transcription engine lock poisoned".to_string())?;
    transcription.stop();

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

#[tauri::command]
fn get_whisper_model_status_command() -> models::WhisperModelStatus {
    get_whisper_model_status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            audio: Mutex::new(AudioCapture::default()),
            transcription: Mutex::new(TranscriptionEngine::default()),
        })
        .invoke_handler(tauri::generate_handler![
            get_input_devices,
            start_audio_capture,
            stop_audio_capture,
            is_audio_capturing,
            get_whisper_model_status_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
