import type { SpotifyDevice } from "../types/spotify";

interface DevicePickerProps {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (deviceId: string, deviceName: string) => void;
  onClose: () => void;
}

export function DevicePicker({ devices, activeDeviceId, onSelectDevice, onClose }: DevicePickerProps) {
  const deviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "computer": return "💻";
      case "smartphone": return "📱";
      case "speaker": return "🔊";
      case "tv": return "📺";
      default: return "🎵";
    }
  };

  return (
    <div className="glass-panel absolute bottom-full right-0 mb-2 w-64 p-2 shadow-xl">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Connect to a device</p>
        <button onClick={onClose} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
      </div>
      {devices.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-[var(--color-text-muted)]">No devices found. Open Spotify on a device to see it here.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {devices.map((device) => (
            <button key={device.id} onClick={() => device.id && onSelectDevice(device.id, device.name)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                device.id === activeDeviceId ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-white/30"
              }`}>
              <span className="text-lg">{deviceIcon(device.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{device.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{device.type}</p>
              </div>
              {device.is_active && <span className="text-xs text-[var(--theme-accent)]">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
