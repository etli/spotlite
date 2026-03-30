import { Laptop, Smartphone, Speaker, Tv, Music, X } from "lucide-react";
import type { SpotifyDevice } from "../types/spotify";

interface DevicePickerProps {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (deviceId: string, deviceName: string) => void;
  onClose: () => void;
}

function DeviceIcon({ type }: { type: string }) {
  const props = { size: 16, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
  switch (type.toLowerCase()) {
    case "computer": return <Laptop {...props} />;
    case "smartphone": return <Smartphone {...props} />;
    case "speaker": return <Speaker {...props} />;
    case "tv": return <Tv {...props} />;
    default: return <Music {...props} />;
  }
}

export function DevicePicker({ devices, activeDeviceId, onSelectDevice, onClose }: DevicePickerProps) {
  return (
    <div className="glass-panel absolute bottom-full right-0 mb-2 w-64 p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[7px] uppercase tracking-wider text-[var(--color-text-muted)]">Connect to a device</p>
        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <X size={14} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
      </div>
      {devices.length === 0 ? (
        <p className="px-2 py-4 text-center text-[7px] text-[var(--color-text-muted)]">No devices found. Open Spotify on a device to see it here.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => device.id && onSelectDevice(device.id, device.name)}
              className={`flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                device.id === activeDeviceId
                  ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <DeviceIcon type={device.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px]">{device.name}</p>
                <p className="text-[7px] text-[var(--color-text-muted)]">{device.type}</p>
              </div>
              {device.is_active && <span className="text-[7px] text-[var(--theme-accent)]">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
