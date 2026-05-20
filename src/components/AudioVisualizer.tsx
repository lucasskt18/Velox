import { useState } from "react";
import { WaveformCanvas } from "./WaveformCanvas";
import { TranscriptCard } from "./TranscriptCard";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { useWhisperModel } from "../hooks/useWhisperModel";
import { useTranscript } from "../hooks/useTranscript";

export function AudioVisualizer() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
  const { fullTranscript, clearTranscript } = useTranscript(isCapturing);

  const levelPercent = Math.min(100, Math.round(level * 100 * 4));
  const modelReady = Boolean(model?.installed);

  return (
    <div className="velox-app">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            V
          </span>
          <div>
            <h1>Velox</h1>
            <p>Transcrição local em tempo real</p>
          </div>
        </div>

        <div className={`status-badge ${isCapturing ? "status-badge--live" : ""}`}>
          <span className="status-badge__dot" />
          {isCapturing ? "Ouvindo" : "Parado"}
        </div>
      </header>

      {!modelReady && (
        <div className="alert-banner">
          Modelo Whisper não encontrado. Rode <code>npm run download-model</code> no terminal.
        </div>
      )}

      <main className="main-stack">
        <TranscriptCard
          isCapturing={isCapturing}
          text={fullTranscript}
          onClear={clearTranscript}
        />

        <section className="audio-strip">
          <WaveformCanvas waveform={waveform} level={level} isActive={isCapturing} compact />
          <div className="audio-strip__meter">
            <div className="audio-strip__meter-track">
              <div className="audio-strip__meter-fill" style={{ width: `${levelPercent}%` }} />
            </div>
            <span>{levelPercent}%</span>
          </div>
        </section>
      </main>

      <footer className="control-dock">
        <label className="field">
          <span className="field__label">Microfone</span>
          <select
            value={selectedDevice}
            disabled={isCapturing}
            onChange={(event) => setSelectedDevice(event.currentTarget.value)}
          >
            {devices.length === 0 ? (
              <option value="">Nenhum dispositivo</option>
            ) : (
              devices.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="control-dock__actions">
          {!isCapturing ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!modelReady}
              onClick={() => void startCapture()}
            >
              Iniciar
            </button>
          ) : (
            <button type="button" className="btn-stop" onClick={() => void stopCapture()}>
              Parar
            </button>
          )}

          <button
            type="button"
            className="btn-ghost"
            disabled={isCapturing}
            onClick={() => void refreshDevices()}
            title="Atualizar lista de microfones"
          >
            ↻
          </button>
        </div>
      </footer>

      <DiagnosticsPanel
        open={showDiagnostics}
        onToggle={() => setShowDiagnostics((prev) => !prev)}
        modelInstalled={modelReady}
        modelId={model?.modelId ?? "base-q5_1"}
        modelFile={model?.fileName}
        modelSize={formattedSize}
        modelPath={model?.path}
        onRefreshModel={refreshModel}
        isCapturing={isCapturing}
        inputSampleRate={inputSampleRate}
        chunksReady={chunksReady}
        pendingSamples={pendingSamples}
        resampledSampleRate={resampledSampleRate}
        lastChunkDurationMs={lastChunkDurationMs}
        resampledChunkLen={resampledChunkLen}
      />

      {error && <p className="error-banner">{error}</p>}
    </div>
  );
}
