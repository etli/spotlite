import { useCallback, useRef, useState, useEffect } from "react";
import { usePlayerStore } from "../store/player-store";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ProgressBar({ progressMs, durationMs, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [displayMs, setDisplayMs] = useState(progressMs);

  useEffect(() => {
    setDisplayMs(progressMs);
  }, [progressMs]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDisplayMs((prev) => {
        const next = prev + 250;
        return next > durationMs ? durationMs : next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const percent = durationMs > 0 ? (displayMs / durationMs) * 100 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || durationMs === 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(Math.floor(ratio * durationMs));
    },
    [durationMs, onSeek],
  );

  return (
    <div className="flex items-center gap-2 text-[7px] text-[var(--color-text-muted)]">
      <span className="w-10 text-right">{formatTime(displayMs)}</span>
      <div
        ref={barRef}
        className="group relative h-1.5 flex-1 cursor-pointer border border-[var(--color-border)] bg-[var(--color-surface-hover)]"
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 h-full bg-[var(--theme-primary)]"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 bg-[var(--color-text-primary)] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${percent}%`, marginLeft: "-6px" }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
