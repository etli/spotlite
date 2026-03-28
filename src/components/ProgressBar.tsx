import { useCallback, useRef } from "react";

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
  const percent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

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
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <span className="w-10 text-right">{formatTime(progressMs)}</span>
      <div
        ref={barRef}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/30"
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--theme-accent)]"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ left: `${percent}%`, marginLeft: "-6px" }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
