import { SkipBack, Play, Pause, SkipForward, ChevronUp } from "lucide-react";
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
      {albumArt && <img src={albumArt} alt="" className="glow w-full max-w-xs object-cover" />}
      <div className="w-full max-w-xs text-center">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="mt-2 truncate text-[8px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
      </div>
      <div className="w-full max-w-xs">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="flex items-center gap-5">
        <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
          <SkipBack size={20} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.togglePlay}
          className="flex h-14 w-14 items-center justify-center bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105">
          {isPlaying
            ? <Pause size={24} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
            : <Play size={24} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
        <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
          <SkipForward size={20} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
      </div>
      <button onClick={onToggleMode} className="flex items-center gap-1 text-[8px] text-[var(--color-text-muted)] transition-opacity hover:opacity-70">
        <ChevronUp size={12} strokeLinecap="square" strokeLinejoin="miter" />
        Full mode
      </button>
    </div>
  );
}
