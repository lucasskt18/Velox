import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  waveform: number[];
  level: number;
  isActive: boolean;
  compact?: boolean;
}

export function WaveformCanvas({ waveform, level, isActive, compact = false }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = compact ? 360 : 420;
  const height = compact ? 56 : 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!compact) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.12)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.04)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (waveform.length > 0) {
      ctx.strokeStyle = isActive ? "#67e8f9" : "#475569";
      ctx.lineWidth = compact ? 1.5 : 2;
      ctx.beginPath();

      waveform.forEach((sample, index) => {
        const x = (index / (waveform.length - 1)) * width;
        const amplitude = compact ? 0.35 : 0.42;
        const y = height / 2 - sample * (height * amplitude);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    if (!compact) {
      const meterWidth = Math.min(width * level * 2.5, width);
      const meterGradient = ctx.createLinearGradient(0, 0, width, 0);
      meterGradient.addColorStop(0, "#22d3ee");
      meterGradient.addColorStop(1, "#6366f1");
      ctx.fillStyle = meterGradient;
      ctx.fillRect(0, height - 6, meterWidth, 4);
    }
  }, [waveform, level, isActive, compact, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`waveform-canvas${compact ? " waveform-canvas--compact" : ""}`}
      width={width}
      height={height}
      aria-label="Forma de onda do áudio"
    />
  );
}
