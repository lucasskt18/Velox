use rubato::{
    Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
};

pub const TARGET_SAMPLE_RATE: u32 = 16_000;

pub struct MonoResampler {
    resampler: SincFixedIn<f32>,
}

impl MonoResampler {
    pub fn new(input_rate: u32, chunk_frames: usize) -> Result<Self, String> {
        let ratio = TARGET_SAMPLE_RATE as f64 / input_rate as f64;

        let params = SincInterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 256,
            window: WindowFunction::BlackmanHarris2,
        };

        let resampler = SincFixedIn::<f32>::new(ratio, 2.0, params, chunk_frames, 1)
            .map_err(|e| format!("failed to create resampler: {e}"))?;

        Ok(Self { resampler })
    }

    pub fn process(&mut self, mono_samples: &[f32]) -> Result<Vec<f32>, String> {
        if mono_samples.is_empty() {
            return Ok(Vec::new());
        }

        let frames = vec![mono_samples.to_vec()];
        let output = self
            .resampler
            .process(&frames, None)
            .map_err(|e| format!("resample failed: {e}"))?;

        Ok(output.into_iter().flatten().collect())
    }
}

pub fn to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
    let channels = channels as usize;
    if channels <= 1 {
        return samples.to_vec();
    }

    samples
        .chunks(channels)
        .map(|frame| frame.iter().sum::<f32>() / channels as f32)
        .collect()
}

pub fn compute_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let sum_sq: f32 = samples.iter().map(|s| s * s).sum();
    (sum_sq / samples.len() as f32).sqrt()
}

pub fn downsample_waveform(samples: &[f32], points: usize) -> Vec<f32> {
    if samples.is_empty() || points == 0 {
        return Vec::new();
    }

    let step = samples.len() as f32 / points as f32;
    (0..points)
        .map(|i| {
            let idx = (i as f32 * step) as usize;
            samples.get(idx).copied().unwrap_or(0.0)
        })
        .collect()
}
