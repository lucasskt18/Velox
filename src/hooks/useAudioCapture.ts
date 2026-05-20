import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AudioCaptureState, AudioChunkReadyPayload, AudioLevelPayload } from "../types/audio";

const initialState: AudioCaptureState = {
  isCapturing: false,
  level: 0,
  waveform: [],
  inputSampleRate: null,
  resampledSampleRate: null,
  resampledChunkLen: 0,
  chunksReady: 0,
  lastChunkDurationMs: null,
  pendingSamples: 0,
  devices: [],
  selectedDevice: "",
  error: null,
};

export function useAudioCapture() {
  const [state, setState] = useState<AudioCaptureState>(initialState);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await invoke<string[]>("get_input_devices");
      setState((prev) => ({
        ...prev,
        devices,
        selectedDevice: prev.selectedDevice || devices[0] || "",
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: String(error),
      }));
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<AudioLevelPayload>("audio-level", (event) => {
      const { level, waveform, inputSampleRate, resampledSampleRate, resampledChunkLen } =
        event.payload;

      setState((prev) => ({
        ...prev,
        level,
        waveform,
        inputSampleRate,
        resampledSampleRate,
        resampledChunkLen,
      }));
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<AudioChunkReadyPayload>("audio-chunk-ready", (event) => {
      const { chunkIndex, durationMs, pendingSamples } = event.payload;

      setState((prev) => ({
        ...prev,
        chunksReady: chunkIndex,
        lastChunkDurationMs: durationMs,
        pendingSamples,
      }));
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const startCapture = useCallback(async () => {
    try {
      await invoke("start_audio_capture", {
        deviceName: state.selectedDevice || null,
      });
      setState((prev) => ({
        ...prev,
        isCapturing: true,
        chunksReady: 0,
        lastChunkDurationMs: null,
        pendingSamples: 0,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isCapturing: false,
        error: String(error),
      }));
    }
  }, [state.selectedDevice]);

  const stopCapture = useCallback(async () => {
    try {
      await invoke("stop_audio_capture");
      setState((prev) => ({
        ...prev,
        isCapturing: false,
        level: 0,
        waveform: [],
        resampledChunkLen: 0,
        chunksReady: 0,
        lastChunkDurationMs: null,
        pendingSamples: 0,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: String(error),
      }));
    }
  }, []);

  const setSelectedDevice = useCallback((device: string) => {
    setState((prev) => ({ ...prev, selectedDevice: device }));
  }, []);

  return {
    ...state,
    refreshDevices,
    startCapture,
    stopCapture,
    setSelectedDevice,
  };
}
