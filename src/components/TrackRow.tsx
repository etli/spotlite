import type { SpotifyTrack } from "../types/spotify";

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onContextMenu?: (track: SpotifyTrack, e: React.MouseEvent) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, isPlaying, onPlay, onContextMenu }: TrackRowProps) {
  return (
    <button
      onClick={onPlay}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(track, e); } : undefined}
      className={`group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/30 ${
        isPlaying ? "bg-[var(--theme-accent)]/10" : ""
      }`}>
      <span className="w-6 text-center text-sm text-[var(--color-text-muted)] group-hover:hidden">{index + 1}</span>
      <span className="hidden w-6 text-center text-sm group-hover:block">▶</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isPlaying ? "font-medium text-[var(--theme-accent)]" : "text-[var(--color-text-primary)]"}`}>{track.name}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{track.artists.map((a) => a.name).join(", ")}</p>
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{formatDuration(track.duration_ms)}</span>
    </button>
  );
}
