import { useState, useEffect, useCallback } from "react";
import type { SpotifyDevice } from "../types/spotify";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";

export function useDevices() {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setDevice = usePlayerStore((s) => s.setDevice);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  const fetchDevices = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api.get<{ devices: SpotifyDevice[] }>("/v1/me/player/devices");
      setDevices(data.devices);
    } catch { /* non-critical */ }
  }, [accessToken]);

  const transferPlayback = useCallback(async (deviceId: string, deviceName: string) => {
    try {
      await api.put("/v1/me/player", { device_ids: [deviceId] });
      const isLocal = deviceName === "Spotlite";
      setDevice(deviceId, deviceName, isLocal);
    } catch { /* transfer failed */ }
  }, [api, setDevice]);

  useEffect(() => {
    if (!accessToken) return;
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [accessToken, fetchDevices]);

  return { devices, fetchDevices, transferPlayback };
}
