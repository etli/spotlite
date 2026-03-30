import { VolumeX, Volume1, Volume2 } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onVolumeChange(volume === 0 ? 50 : 0)} className="transition-opacity hover:opacity-70">
        <Icon size={16} strokeLinecap="square" strokeLinejoin="miter" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer appearance-none bg-[var(--color-surface-hover)] accent-[var(--theme-primary)]"
      />
    </div>
  );
}
