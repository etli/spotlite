import { X, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1 } from "lucide-react";
import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";

interface NowPlayingProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
  };
  onClose: () => void;
}

export function NowPlaying({ playback, onClose }: NowPlayingProps) {
  const { currentTrack, isPlaying, progressMs, durationMs, shuffleState, repeatState } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)] p-8">
      <button onClick={onClose} className="absolute right-6 top-6 text-[var(--color-text-muted)] transition-opacity hover:opacity-70">
        <X size={20} strokeLinecap="square" strokeLinejoin="miter" />
      </button>
      {albumArt && (
        <img src={albumArt} alt="" className="glow mb-8 h-72 w-72 object-cover sm:h-80 sm:w-80 lg:h-96 lg:w-96" />
      )}
      <div className="mb-6 text-center">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="mt-2 text-[9px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
        <p className="mt-1 text-[8px] text-[var(--color-text-muted)]">{currentTrack?.album?.name}</p>
      </div>
      <div className="w-full max-w-md">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="mt-6 flex items-center gap-6">
        <button className={`transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"}`}>
          <Shuffle size={18} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
          <SkipBack size={22} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.togglePlay}
          className="flex h-16 w-16 items-center justify-center bg-[var(--theme-accent)] text-white shadow-lg transition-all hover:scale-105">
          {isPlaying
            ? <Pause size={28} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
            : <Play size={28} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
        <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
          <SkipForward size={22} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button className={`transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"}`}>
          {repeatState === "track"
            ? <Repeat1 size={18} strokeLinecap="square" strokeLinejoin="miter" />
            : <Repeat size={18} strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
      </div>
    </div>
  );
}
