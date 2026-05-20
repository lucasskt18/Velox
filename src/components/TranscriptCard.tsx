import { useEffect, useRef } from "react";

interface TranscriptCardProps {
  isCapturing: boolean;
  text: string;
  onClear: () => void;
}

export function TranscriptCard({ isCapturing, text, onClear }: TranscriptCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [text]);

  const isEmpty = !text.trim();

  return (
    <section className="transcript-card" aria-live="polite">
      <div className="transcript-card__head">
        <h2>Transcrição</h2>
        {text.trim() && (
          <button type="button" className="btn-text" onClick={onClear}>
            Limpar
          </button>
        )}
      </div>

      <div ref={scrollRef} className="transcript-card__body">
        {isEmpty ? (
          <p className="transcript-card__placeholder">
            {isCapturing
              ? "Ouvindo… fale em frases curtas e o texto aparece aqui."
              : "Toque em Iniciar para começar a transcrever."}
          </p>
        ) : (
          <p className="transcript-card__text">{text}</p>
        )}
      </div>
    </section>
  );
}
