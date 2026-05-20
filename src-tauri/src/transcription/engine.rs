use crossbeam_channel::{Receiver, Sender};
use std::path::PathBuf;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread::{self, JoinHandle};
use tauri::{AppHandle, Emitter};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::audio::{CompletedChunk, compute_rms};
use crate::models::default_model_path;

const SILENCE_RMS_THRESHOLD: f32 = 0.008;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptPartialPayload {
    pub chunk_index: u64,
    pub text: String,
}

pub struct TranscriptionEngine {
    stop: Arc<AtomicBool>,
    job_tx: Option<Sender<CompletedChunk>>,
    worker: Option<JoinHandle<()>>,
}

impl Default for TranscriptionEngine {
    fn default() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(true)),
            job_tx: None,
            worker: None,
        }
    }
}

impl TranscriptionEngine {
    pub fn is_running(&self) -> bool {
        self.worker.is_some()
    }

    pub fn start(&mut self, app: AppHandle) -> Result<Sender<CompletedChunk>, String> {
        if let Some(tx) = &self.job_tx {
            return Ok(tx.clone());
        }

        let model_path = default_model_path();
        if !model_path.is_file() {
            return Err(
                "Whisper model not installed. Run `npm run download-model` in the project folder."
                    .to_string(),
            );
        }

        let (job_tx, job_rx) = crossbeam_channel::unbounded();
        let stop = Arc::new(AtomicBool::new(false));
        let worker_stop = Arc::clone(&stop);

        let worker = thread::spawn(move || {
            if let Err(error) = run_worker(app, model_path, job_rx, worker_stop) {
                eprintln!("transcription worker stopped: {error}");
            }
        });

        self.stop = stop;
        self.job_tx = Some(job_tx.clone());
        self.worker = Some(worker);

        Ok(job_tx)
    }

    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        self.job_tx = None;

        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

fn run_worker(
    app: AppHandle,
    model_path: PathBuf,
    job_rx: Receiver<CompletedChunk>,
    stop: Arc<AtomicBool>,
) -> Result<(), String> {
    eprintln!("Loading Whisper model from {}", model_path.display());

    let mut ctx_params = WhisperContextParameters::default();
    ctx_params.use_gpu(true);

    let ctx = WhisperContext::new_with_params(
        &model_path
            .to_str()
            .ok_or_else(|| "model path is not valid UTF-8".to_string())?,
        ctx_params,
    )
    .map_err(|error| format!("failed to load Whisper model: {error}"))?;

    let mut state = ctx
        .create_state()
        .map_err(|error| format!("failed to create Whisper state: {error}"))?;

    eprintln!("Whisper model loaded. Waiting for audio chunks...");

    while !stop.load(Ordering::SeqCst) {
        let chunk = match job_rx.recv_timeout(std::time::Duration::from_millis(100)) {
            Ok(chunk) => chunk,
            Err(crossbeam_channel::RecvTimeoutError::Timeout) => continue,
            Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
        };

        if compute_rms(&chunk.samples) < SILENCE_RMS_THRESHOLD {
            continue;
        }

        match transcribe_chunk(&mut state, &chunk.samples) {
            Ok(text) if !text.trim().is_empty() => {
                eprintln!("[chunk {}] {text}", chunk.index);
                let _ = app.emit(
                    "transcript-partial",
                    TranscriptPartialPayload {
                        chunk_index: chunk.index,
                        text: text.trim().to_string(),
                    },
                );
            }
            Ok(_) => {}
            Err(error) => eprintln!("transcription failed for chunk {}: {error}", chunk.index),
        }
    }

    Ok(())
}

fn transcribe_chunk(state: &mut whisper_rs::WhisperState, samples: &[f32]) -> Result<String, String> {
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    params.set_language(None);
    params.set_translate(false);
    params.set_no_context(true);
    params.set_single_segment(true);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_n_threads(
        thread::available_parallelism()
            .map(|count| count.get() as i32)
            .unwrap_or(4),
    );

    state
        .full(params, samples)
        .map_err(|error| format!("whisper inference failed: {error}"))?;

    let mut text = String::new();
    for segment in state.as_iter() {
        match segment.to_str() {
            Ok(segment_text) => text.push_str(segment_text),
            Err(error) => return Err(format!("invalid segment text: {error}")),
        }
    }

    Ok(text)
}
