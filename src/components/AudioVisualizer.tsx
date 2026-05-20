import { WaveformCanvas } from "./WaveformCanvas";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { useWhisperModel } from "../hooks/useWhisperModel";
import { useTranscript } from "../hooks/useTranscript";

export function AudioVisualizer() {
  const {
    isCapturing,
    level,
    waveform,
    inputSampleRate,
    resampledSampleRate,
    resampledChunkLen,
    chunksReady,
    lastChunkDurationMs,
    pendingSamples,
    devices,
    selectedDevice,
    error,
    refreshDevices,
    startCapture,
    stopCapture,
    setSelectedDevice,
  } = useAudioCapture();

  const { model, formattedSize, refreshModel } = useWhisperModel();
  const { latestText, fullTranscript, clearTranscript } = useTranscript(isCapturing);

  const levelPercent = Math.min(100, Math.round(level * 100 * 4));

  return (
    <div className="velox">
      <header className="velox-header">
        <div>
          <p className="eyebrow">Phase 2.3 · Live transcript</p>
          <h1>Velox</h1>
          <p className="subtitle">Real-time speech transcription overlay</p>
        </div>
        <span className={`status-pill ${isCapturing ? "live" : ""}`}>
          {isCapturing ? "Listening" : "Idle"}
        </span>
      </header>

      <section className="panel">
        <WaveformCanvas waveform={waveform} level={level} isActive={isCapturing} />

        <div className="level-row">
          <span>Input level</span>
          <div className="level-bar">
            <div className="level-fill" style={{ width: `${levelPercent}%` }} />
          </div>
          <span className="mono">{levelPercent}%</span>
        </div>
      </section>

      <section className="panel transcript-panel">
        <div className="transcript-header">
          <span className="stat-label">Live transcript</span>
          {fullTranscript && (
            <button type="button" className="ghost transcript-clear" onClick={clearTranscript}>
              Clear
            </button>
          )}
        </div>

        <p className="transcript-latest">
          {isCapturing
            ? latestText || "Speak into the microphone — text appears every ~500 ms..."
            : "Press Start capture to begin transcribing."}
        </p>

        {fullTranscript && <p className="transcript-full">{fullTranscript}</p>}
      </section>

      <section className="panel controls">
        <label htmlFor="device-select">Microphone</label>
        <select
          id="device-select"
          value={selectedDevice}
          disabled={isCapturing}
          onChange={(event) => setSelectedDevice(event.currentTarget.value)}
        >
          {devices.length === 0 ? (
            <option value="">No input devices found</option>
          ) : (
            devices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))
          )}
        </select>

        <div className="button-row">
          {!isCapturing ? (
            <button type="button" className="primary" onClick={() => void startCapture()}>
              Start capture
            </button>
          ) : (
            <button type="button" className="danger" onClick={() => void stopCapture()}>
              Stop capture
            </button>
          )}
          <button type="button" className="ghost" disabled={isCapturing} onClick={() => void refreshDevices()}>
            Refresh devices
          </button>
        </div>
      </section>

      <section className="panel model-panel">
        <div className="model-header">
          <div>
            <span className="stat-label">Whisper model</span>
            <strong>{model?.modelId ?? "base-q5_1"}</strong>
          </div>
          <span className={`status-pill ${model?.installed ? "live" : "missing"}`}>
            {model?.installed ? "Installed" : "Missing"}
          </span>
        </div>

        <p className="model-detail">
          {model?.installed
            ? `${model.fileName} · ${formattedSize}`
            : "Model not found on disk yet."}
        </p>

        {!model?.installed && (
          <p className="model-hint">
            Run in terminal: <code>npm run download-model</code>
          </p>
        )}

        {model?.installed && (
          <p className="model-path" title={model.path}>
            {model.path}
          </p>
        )}

        <button type="button" className="ghost model-refresh" onClick={() => void refreshModel()}>
          Check model status
        </button>
      </section>

      <section className="panel stats">
        <div>
          <span className="stat-label">Input rate</span>
          <strong>{inputSampleRate ? `${inputSampleRate} Hz` : "—"}</strong>
        </div>
        <div>
          <span className="stat-label">Chunks ready</span>
          <strong>{isCapturing ? chunksReady : "—"}</strong>
        </div>
        <div>
          <span className="stat-label">Buffer</span>
          <strong>{isCapturing ? `${pendingSamples} samples` : "—"}</strong>
        </div>
      </section>

      <section className="panel stats secondary-stats">
        <div>
          <span className="stat-label">Resampled</span>
          <strong>{resampledSampleRate ? `${resampledSampleRate} Hz mono` : "—"}</strong>
        </div>
        <div>
          <span className="stat-label">Chunk size</span>
          <strong>{lastChunkDurationMs ? `${lastChunkDurationMs} ms` : "500 ms"}</strong>
        </div>
        <div>
          <span className="stat-label">Last frame</span>
          <strong>{isCapturing ? `${resampledChunkLen} samples` : "—"}</strong>
        </div>
      </section>

      {error && <p className="error-banner">{error}</p>}

      <footer className="footer-note">
        {model?.installed
          ? "Whisper runs locally on each 500 ms chunk. First transcription may take a few seconds while the model loads."
          : "Download the model first: npm run download-model"}
      </footer>
    </div>
  );
}
