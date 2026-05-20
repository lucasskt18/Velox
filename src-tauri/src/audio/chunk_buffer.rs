use super::resampler::TARGET_SAMPLE_RATE;

/// Default window size for speech recognition: 500 ms at 16 kHz.
pub const DEFAULT_CHUNK_MS: u32 = 500;

pub struct CompletedChunk {
    pub index: u64,
    pub samples: Vec<f32>,
    pub duration_ms: u32,
}

pub struct ChunkBuffer {
    target_samples: usize,
    buffer: Vec<f32>,
    chunk_index: u64,
    duration_ms: u32,
}

impl ChunkBuffer {
    pub fn new(duration_ms: u32) -> Self {
        let target_samples =
            (TARGET_SAMPLE_RATE as u64 * duration_ms as u64 / 1000).max(1) as usize;

        Self {
            target_samples,
            buffer: Vec::with_capacity(target_samples),
            chunk_index: 0,
            duration_ms,
        }
    }

    pub fn pending_samples(&self) -> usize {
        self.buffer.len()
    }

    pub fn target_samples(&self) -> usize {
        self.target_samples
    }

    pub fn duration_ms(&self) -> u32 {
        self.duration_ms
    }

    /// Adds resampled mono samples and returns any chunks that reached the target size.
    pub fn push(&mut self, samples: &[f32]) -> Vec<CompletedChunk> {
        self.buffer.extend_from_slice(samples);

        let mut completed = Vec::new();

        while self.buffer.len() >= self.target_samples {
            let chunk_samples: Vec<f32> = self.buffer.drain(..self.target_samples).collect();
            self.chunk_index += 1;

            completed.push(CompletedChunk {
                index: self.chunk_index,
                samples: chunk_samples,
                duration_ms: self.duration_ms,
            });
        }

        completed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emits_chunk_after_target_samples() {
        let mut buffer = ChunkBuffer::new(500);
        assert_eq!(buffer.target_samples(), 8000);

        let first = buffer.push(&vec![0.0; 4000]);
        assert!(first.is_empty());
        assert_eq!(buffer.pending_samples(), 4000);

        let second = buffer.push(&vec![0.0; 4000]);
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].index, 1);
        assert_eq!(second[0].samples.len(), 8000);
        assert_eq!(buffer.pending_samples(), 0);
    }
}
