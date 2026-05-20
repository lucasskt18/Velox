interface DiagnosticsPanelProps {
  open: boolean;
  onToggle: () => void;
  modelInstalled: boolean;
  modelId: string;
  modelFile?: string;
  modelSize?: string | null;
  modelPath?: string;
  onRefreshModel: () => void;
  isCapturing: boolean;
  inputSampleRate: number | null;
  chunksReady: number;
  pendingSamples: number;
  resampledSampleRate: number | null;
  lastChunkDurationMs: number | null;
  resampledChunkLen: number;
}

export function DiagnosticsPanel({
  open,
  onToggle,
  modelInstalled,
  modelId,
  modelFile,
  modelSize,
  modelPath,
  onRefreshModel,
  isCapturing,
  inputSampleRate,
  chunksReady,
  pendingSamples,
  resampledSampleRate,
  lastChunkDurationMs,
  resampledChunkLen,
}: DiagnosticsPanelProps) {
  return (
    <section className="diagnostics">
      <button type="button" className="diagnostics__toggle" onClick={onToggle} aria-expanded={open}>
        <span>Diagnóstico técnico</span>
        <span className="diagnostics__chevron" data-open={open}>
          ›
        </span>
      </button>

      {open && (
        <div className="diagnostics__body">
          <div className="diagnostics__group">
            <h3>Modelo Whisper</h3>
            <div className="diagnostics__row">
              <span>Status</span>
              <strong>{modelInstalled ? "Instalado" : "Ausente"}</strong>
            </div>
            <div className="diagnostics__row">
              <span>Variante</span>
              <strong>{modelId}</strong>
            </div>
            {modelInstalled && modelFile && (
              <div className="diagnostics__row">
                <span>Arquivo</span>
                <strong>
                  {modelFile}
                  {modelSize ? ` · ${modelSize}` : ""}
                </strong>
              </div>
            )}
            {modelPath && (
              <p className="diagnostics__path" title={modelPath}>
                {modelPath}
              </p>
            )}
            {!modelInstalled && (
              <p className="diagnostics__hint">
                Execute <code>npm run download-model</code>
              </p>
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => void onRefreshModel()}>
              Verificar modelo
            </button>
          </div>

          <div className="diagnostics__group">
            <h3>Pipeline de áudio</h3>
            <div className="diagnostics__grid">
              <div>
                <span>Entrada</span>
                <strong>{inputSampleRate ? `${inputSampleRate} Hz` : "—"}</strong>
              </div>
              <div>
                <span>Resample</span>
                <strong>{resampledSampleRate ? `${resampledSampleRate} Hz` : "—"}</strong>
              </div>
              <div>
                <span>Chunks</span>
                <strong>{isCapturing ? chunksReady : "—"}</strong>
              </div>
              <div>
                <span>Buffer</span>
                <strong>{isCapturing ? pendingSamples : "—"}</strong>
              </div>
              <div>
                <span>Janela</span>
                <strong>{lastChunkDurationMs ? `${lastChunkDurationMs} ms` : "500 ms"}</strong>
              </div>
              <div>
                <span>Último frame</span>
                <strong>{isCapturing ? resampledChunkLen : "—"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
