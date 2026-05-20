export interface AudioLevelPayload {
  level: number;
  waveform: number[];
  inputSampleRate: number;
  resampledSampleRate: number;
  resampledChunkLen: number;
}

export interface AudioCaptureState {
  isCapturing: boolean;
  level: number;
  waveform: number[];
  inputSampleRate: number | null;
  resampledSampleRate: number | null;
  resampledChunkLen: number;
  devices: string[];
  selectedDevice: string;
  error: string | null;
}
