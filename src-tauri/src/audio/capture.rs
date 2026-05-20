use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat, Stream, StreamConfig};
use crossbeam_channel::Sender;
use std::cell::RefCell;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::chunk_buffer::{ChunkBuffer, CompletedChunk, DEFAULT_CHUNK_MS};
use super::resampler::{self, MonoResampler, TARGET_SAMPLE_RATE};

const WAVEFORM_POINTS: usize = 64;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioLevelPayload {
    pub level: f32,
    pub waveform: Vec<f32>,
    pub input_sample_rate: u32,
    pub resampled_sample_rate: u32,
    pub resampled_chunk_len: usize,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioChunkReadyPayload {
    pub chunk_index: u64,
    pub sample_count: usize,
    pub duration_ms: u32,
    pub pending_samples: usize,
}

pub struct AudioCapture {
    stop: Arc<AtomicBool>,
    worker: Option<JoinHandle<()>>,
}

impl Default for AudioCapture {
    fn default() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(true)),
            worker: None,
        }
    }
}

impl AudioCapture {
    pub fn is_running(&self) -> bool {
        self.worker.is_some()
    }

    pub fn start(
        &mut self,
        app: AppHandle,
        device_name: Option<String>,
        chunk_tx: Option<Sender<CompletedChunk>>,
    ) -> Result<(), String> {
        if self.worker.is_some() {
            return Ok(());
        }

        let stop = Arc::new(AtomicBool::new(false));
        let worker_stop = Arc::clone(&stop);
        let worker = thread::spawn(move || {
            if let Err(error) = run_capture(app, device_name, worker_stop, chunk_tx) {
                eprintln!("audio capture stopped with error: {error}");
            }
        });

        self.stop = stop;
        self.worker = Some(worker);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);

        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

fn run_capture(
    app: AppHandle,
    device_name: Option<String>,
    stop: Arc<AtomicBool>,
    chunk_tx: Option<Sender<CompletedChunk>>,
) -> Result<(), String> {
    let host = cpal::default_host();
    let device = match device_name {
        Some(name) => host
            .input_devices()
            .map_err(|e| format!("failed to list input devices: {e}"))?
            .find(|d| d.name().ok().as_deref() == Some(name.as_str()))
            .ok_or_else(|| format!("input device not found: {name}"))?,
        None => host
            .default_input_device()
            .ok_or_else(|| "no default input device available".to_string())?,
    };

    let supported = device
        .default_input_config()
        .map_err(|e| format!("failed to read input config: {e}"))?;

    let input_sample_rate = supported.sample_rate().0;
    let channels = supported.channels();
    let sample_format = supported.sample_format();
    let config: StreamConfig = supported.into();

    let chunk_frames = (input_sample_rate as usize / 50).max(128);
    let resampler = RefCell::new(MonoResampler::new(input_sample_rate, chunk_frames)?);
    let chunk_buffer = RefCell::new(ChunkBuffer::new(DEFAULT_CHUNK_MS));

    let stream = match sample_format {
        SampleFormat::F32 => build_stream::<f32>(
            &device,
            &config,
            channels,
            input_sample_rate,
            app,
            resampler,
            chunk_buffer,
            chunk_tx.clone(),
        )?,
        SampleFormat::I16 => build_stream::<i16>(
            &device,
            &config,
            channels,
            input_sample_rate,
            app,
            resampler,
            chunk_buffer,
            chunk_tx.clone(),
        )?,
        SampleFormat::U16 => build_stream::<u16>(
            &device,
            &config,
            channels,
            input_sample_rate,
            app,
            resampler,
            chunk_buffer,
            chunk_tx.clone(),
        )?,
        other => return Err(format!("unsupported sample format: {other:?}")),
    };

    stream
        .play()
        .map_err(|e| format!("failed to start audio stream: {e}"))?;

    while !stop.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(50));
    }

    drop(stream);
    Ok(())
}

fn build_stream<T>(
    device: &cpal::Device,
    config: &StreamConfig,
    channels: u16,
    input_sample_rate: u32,
    app: AppHandle,
    resampler: RefCell<MonoResampler>,
    chunk_buffer: RefCell<ChunkBuffer>,
    chunk_tx: Option<Sender<CompletedChunk>>,
) -> Result<Stream, String>
where
    T: Sample + cpal::SizedSample,
    f32: cpal::FromSample<T>,
{
    let err_fn = |err| eprintln!("audio stream error: {err}");

    device
        .build_input_stream(
            config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                let float_samples: Vec<f32> = data.iter().map(|s| s.to_sample()).collect();
                let mono = resampler::to_mono(&float_samples, channels);
                let level = resampler::compute_rms(&mono);
                let waveform = resampler::downsample_waveform(&mono, WAVEFORM_POINTS);

                let resampled = resampler.borrow_mut().process(&mono).unwrap_or_default();
                let resampled_chunk_len = resampled.len();

                if !resampled.is_empty() {
                    let completed = chunk_buffer.borrow_mut().push(&resampled);
                    let pending_samples = chunk_buffer.borrow().pending_samples();

                    for chunk in completed {
                        let chunk_index = chunk.index;
                        let sample_count = chunk.samples.len();
                        let duration_ms = chunk.duration_ms;

                        if let Some(ref tx) = chunk_tx {
                            let _ = tx.send(chunk);
                        }

                        let _ = app.emit(
                            "audio-chunk-ready",
                            AudioChunkReadyPayload {
                                chunk_index,
                                sample_count,
                                duration_ms,
                                pending_samples,
                            },
                        );
                    }
                }

                let _ = app.emit(
                    "audio-level",
                    AudioLevelPayload {
                        level,
                        waveform,
                        input_sample_rate,
                        resampled_sample_rate: TARGET_SAMPLE_RATE,
                        resampled_chunk_len,
                    },
                );
            },
            err_fn,
            None,
        )
        .map_err(|e| format!("failed to build input stream: {e}"))
}

pub fn list_input_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let devices = host
        .input_devices()
        .map_err(|e| format!("failed to list input devices: {e}"))?;

    devices
        .map(|device| {
            device
                .name()
                .map_err(|e| format!("failed to read device name: {e}"))
        })
        .collect()
}
