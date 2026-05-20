import { WaveformCanvas } from "./WaveformCanvas";
import { useAudioCapture } from "../hooks/useAudioCapture";

export function AudioVisualizer() {
  const {
    isCapturing,
    level,
    waveform,
    inputSampleRate,
    resampledSampleRate,
    resampledChunkLen,
    devices,
    selectedDevice,
    error,
    refreshDevices,
    startCapture,
    stopCapture,
    setSelectedDevice,
  } = useAudioCapture();

  const levelPercent = Math.min(100, Math.round(level * 100 * 4));

  return (
    <div className="velox">
      <header className="velox-header">
        <div>
          <p className="eyebrow">Phase 1 · Audio capture</p>
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

      <section className="panel stats">
        <div>
          <span className="stat-label">Input rate</span>
          <strong>{inputSampleRate ? `${inputSampleRate} Hz` : "—"}</strong>
        </div>
        <div>
          <span className="stat-label">Resampled</span>
          <strong>{resampledSampleRate ? `${resampledSampleRate} Hz mono` : "—"}</strong>
        </div>
        <div>
          <span className="stat-label">Last chunk</span>
          <strong>{isCapturing ? `${resampledChunkLen} samples` : "—"}</strong>
        </div>
      </section>

      {error && <p className="error-banner">{error}</p>}

      <footer className="footer-note">
        Next up: stream 16 kHz PCM chunks to Deepgram for live transcription.
      </footer>
    </div>
  );
}
