import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, MonitorSpeaker, ChevronDown } from "lucide-react";
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
              className="glow h-12 w-12 shrink-0 cursor-pointer object-cover transition-transform hover:scale-105" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
            <p className="truncate text-[8px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className={`transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"} hover:opacity-80`}>
            <Shuffle size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
            <SkipBack size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={playback.togglePlay}
            className="flex h-10 w-10 items-center justify-center bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105">
            {isPlaying
              ? <Pause size={20} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
              : <Play size={20} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
          </button>
          <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
            <SkipForward size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={() => {}} className={`transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"} hover:opacity-80`}>
            {repeatState === "track"
              ? <Repeat1 size={16} strokeLinecap="square" strokeLinejoin="miter" />
              : <Repeat size={16} strokeLinecap="square" strokeLinejoin="miter" />}
          </button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          {!isLocalPlayback && activeDeviceName && (
            <span className="text-[7px] text-[var(--theme-accent)]">On: {activeDeviceName}</span>
          )}
          <VolumeControl volume={volume} onVolumeChange={playback.setVolume} />
          <button onClick={onOpenDevices} className="transition-opacity hover:opacity-70" title="Devices">
            <MonitorSpeaker size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={onToggleMode} className="transition-opacity hover:opacity-70" title="Mini player">
            <ChevronDown size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
        </div>
      </div>
    </div>
  );
}
