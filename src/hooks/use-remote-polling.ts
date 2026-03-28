import { useEffect } from "react";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifyPlaybackState } from "../types/spotify";

export function useRemotePolling() {
  const isLocalPlayback = usePlayerStore((s) => s.isLocalPlayback);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setTrack, setPlaybackState, setShuffle, setRepeat, setDevice } = usePlayerStore();

  useEffect(() => {
    if (isLocalPlayback || !accessToken) return;

    const api = createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    );

    const poll = async () => {
      try {
        const state = await api.get<SpotifyPlaybackState>("/v1/me/player");
        if (!state) return;
        if (state.item) setTrack(state.item);
        setPlaybackState(state.is_playing, state.progress_ms ?? 0);
        setShuffle(state.shuffle_state);
        setRepeat(state.repeat_state);
        setDevice(state.device.id, state.device.name, state.device.name === "Spotlite");
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [isLocalPlayback, accessToken, setTrack, setPlaybackState, setShuffle, setRepeat, setDevice]);
}
