import type { SpotifyDevice } from "../types/spotify";
export function DevicePicker({ devices, activeDeviceId, onSelectDevice, onClose }: { devices: SpotifyDevice[]; activeDeviceId: string | null; onSelectDevice: (id: string, name: string) => void; onClose: () => void }) {
  return <div>Device Picker</div>;
}
