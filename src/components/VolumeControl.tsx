interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const icon = volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊";
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onVolumeChange(volume === 0 ? 50 : 0)} className="text-sm transition-opacity hover:opacity-70">{icon}</button>
      <input type="range" min={0} max={100} value={volume} onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-[var(--theme-accent)]" />
    </div>
  );
}
