import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  waveform: number[];
  level: number;
  isActive: boolean;
}

export function WaveformCanvas({ waveform, level, isActive }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.15)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.05)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (waveform.length > 0) {
      ctx.strokeStyle = isActive ? "#38bdf8" : "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();

      waveform.forEach((sample, index) => {
        const x = (index / (waveform.length - 1)) * width;
        const y = height / 2 - sample * (height * 0.42);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    const meterWidth = Math.min(width * level * 2.5, width);
    const meterGradient = ctx.createLinearGradient(0, 0, width, 0);
    meterGradient.addColorStop(0, "#22d3ee");
    meterGradient.addColorStop(1, "#6366f1");
    ctx.fillStyle = meterGradient;
    ctx.fillRect(0, height - 8, meterWidth, 6);
  }, [waveform, level, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={420}
      height={180}
      aria-label="Live audio waveform"
    />
  );
}
