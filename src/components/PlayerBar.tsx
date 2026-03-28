import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";
import { VolumeControl } from "./VolumeControl";

interface PlayerBarProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
    setVolume: (vol: number) => void;
  };
  onToggleMode: () => void;
  onOpenDevices?: () => void;
  onOpenNowPlaying?: () => void;
}

export function PlayerBar({ playback, onToggleMode, onOpenDevices, onOpenNowPlaying }: PlayerBarProps) {
  const { currentTrack, isPlaying, progressMs, durationMs, shuffleState, repeatState, volume, activeDeviceName, isLocalPlayback } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="glass-panel m-2 flex flex-col gap-2 px-4 py-3">
      <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {albumArt && (
            <img src={albumArt} alt="" onClick={onOpenNowPlaying}
              className="glow h-12 w-12 shrink-0 cursor-pointer rounded-lg object-cover transition-transform hover:scale-105" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
            <p className="truncate text-xs text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className={`text-sm transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"} hover:opacity-80`}>🔀</button>
          <button onClick={playback.previousTrack} className="text-lg transition-opacity hover:opacity-70">⏮</button>
          <button onClick={playback.togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105">
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={playback.nextTrack} className="text-lg transition-opacity hover:opacity-70">⏭</button>
          <button onClick={() => {}} className={`text-sm transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"} hover:opacity-80`}>🔁</button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          {!isLocalPlayback && activeDeviceName && (
            <span className="text-xs text-[var(--theme-accent)]">Listening on: {activeDeviceName}</span>
          )}
          <VolumeControl volume={volume} onVolumeChange={playback.setVolume} />
          <button onClick={onOpenDevices} className="text-sm transition-opacity hover:opacity-70" title="Devices">📡</button>
          <button onClick={onToggleMode} className="text-sm transition-opacity hover:opacity-70" title="Mini player">🔽</button>
        </div>
      </div>
    </div>
  );
}
