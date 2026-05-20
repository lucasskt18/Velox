import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface WhisperModelStatus {
  installed: boolean;
  modelId: string;
  fileName: string;
  path: string;
  sizeBytes: number;
  modelsDir: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function useWhisperModel() {
  const [model, setModel] = useState<WhisperModelStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshModel = useCallback(async () => {
    try {
      const status = await invoke<WhisperModelStatus>("get_whisper_model_status_command");
      setModel(status);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void refreshModel();
  }, [refreshModel]);

  return {
    model,
    error,
    refreshModel,
    formattedSize: model ? formatBytes(model.sizeBytes) : null,
  };
}
