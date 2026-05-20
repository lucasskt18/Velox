import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export interface TranscriptPartialPayload {
  chunkIndex: number;
  text: string;
}

export function useTranscript(isCapturing: boolean) {
  const [latestText, setLatestText] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");

  useEffect(() => {
    if (!isCapturing) {
      setLatestText("");
      setFullTranscript("");
    }
  }, [isCapturing]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<TranscriptPartialPayload>("transcript-partial", (event) => {
      const { text } = event.payload;
      if (!text.trim()) return;

      setLatestText(text);
      setFullTranscript((prev) => (prev ? `${prev} ${text}` : text));
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const clearTranscript = useCallback(() => {
    setLatestText("");
    setFullTranscript("");
  }, []);

  return {
    latestText,
    fullTranscript,
    clearTranscript,
  };
}
