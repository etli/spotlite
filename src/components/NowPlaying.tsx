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
      <button onClick={onClose} className="absolute right-6 top-6 text-lg text-[var(--color-text-muted)] transition-opacity hover:opacity-70">✕</button>
      {albumArt && <img src={albumArt} alt="" className="glow mb-8 h-72 w-72 rounded-3xl object-cover sm:h-80 sm:w-80 lg:h-96 lg:w-96" />}
      <div className="mb-6 text-center">
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{currentTrack?.album?.name}</p>
      </div>
      <div className="w-full max-w-md">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="mt-6 flex items-center gap-6">
        <button className={`text-lg ${shuffleState ? "opacity-100" : "opacity-40"}`}>🔀</button>
        <button onClick={playback.previousTrack} className="text-2xl transition-opacity hover:opacity-70">⏮</button>
        <button onClick={playback.togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-accent)] text-2xl text-white shadow-lg transition-all hover:scale-105">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={playback.nextTrack} className="text-2xl transition-opacity hover:opacity-70">⏭</button>
        <button className={`text-lg ${repeatState !== "off" ? "opacity-100" : "opacity-40"}`}>🔁</button>
      </div>
    </div>
  );
}
