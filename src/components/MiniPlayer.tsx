import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";

interface MiniPlayerProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
    setVolume: (vol: number) => void;
  };
  onToggleMode: () => void;
}

export function MiniPlayer({ playback, onToggleMode }: MiniPlayerProps) {
  const { currentTrack, isPlaying, progressMs, durationMs } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
      {albumArt && <img src={albumArt} alt="" className="glow w-full max-w-xs rounded-3xl object-cover" />}
      <div className="w-full max-w-xs text-center">
        <p className="truncate text-lg font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="truncate text-sm text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
      </div>
      <div className="w-full max-w-xs">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="flex items-center gap-5">
        <button onClick={playback.previousTrack} className="text-xl transition-opacity hover:opacity-70">⏮</button>
        <button onClick={playback.togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-accent)] text-xl text-white shadow-md transition-all hover:scale-105">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={playback.nextTrack} className="text-xl transition-opacity hover:opacity-70">⏭</button>
      </div>
      <button onClick={onToggleMode} className="text-xs text-[var(--color-text-muted)] transition-opacity hover:opacity-70">🔼 Full mode</button>
    </div>
  );
}
