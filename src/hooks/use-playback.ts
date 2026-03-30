import { useEffect, useRef, useCallback, useMemo } from "react";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { createSpotifyApi } from "../lib/spotify-api";
import type { SpotifyTrack } from "../types/spotify";

const DEVICE_NAME = "Spotlite";

declare global {
  interface Window {
    __onSpotifyReady: Promise<void>;
  }
}

export function usePlayback() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    [],
  );

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const initPlayer = () => {
      if (cancelled) return;
      const player = new window.Spotify.Player({
        name: DEVICE_NAME,
        getOAuthToken: (cb) => {
          const token = useAuthStore.getState().accessToken;
          if (token) cb(token);
        },
        volume: usePlayerStore.getState().volume / 100,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("Spotlite player ready, device_id:", device_id);
        deviceIdRef.current = device_id;
        usePlayerStore.getState().setDevice(device_id, DEVICE_NAME, true);
      });

      player.addListener("not_ready", () => {
        deviceIdRef.current = null;
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Spotify SDK init error:", message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Spotify SDK auth error:", message);
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Spotify SDK account error:", message);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const track = state.track_window.current_track;
        const spotifyTrack: SpotifyTrack = {
          id: track.id,
          name: track.name,
          uri: track.uri,
          duration_ms: track.duration_ms,
          track_number: 1,
          artists: track.artists.map((a) => ({
            id: a.uri.split(":")[2],
            name: a.name,
            uri: a.uri,
          })),
          album: {
            id: track.album.uri.split(":")[2],
            name: track.album.name,
            images: track.album.images,
            artists: [],
            release_date: "",
            total_tracks: 0,
            uri: track.album.uri,
            album_type: "album",
          },
        };
        const { setTrack, setPlaybackState, setShuffle, setRepeat } = usePlayerStore.getState();
        setTrack(spotifyTrack);
        setPlaybackState(!state.paused, state.position);
        setShuffle(state.shuffle);
        const repeatMap = { 0: "off", 1: "context", 2: "track" } as const;
        setRepeat(repeatMap[state.repeat_mode]);
      });

      player.connect();
      playerRef.current = player;
    };

    // Wait for the SDK ready promise set up in index.html
    window.__onSpotifyReady.then(initPlayer);

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [accessToken]);

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
  const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
  const seek = useCallback((ms: number) => playerRef.current?.seek(ms), []);
  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol / 100);
    usePlayerStore.getState().setVolume(vol);
  }, []);

  const toggleShuffle = useCallback(async () => {
    const { shuffleState, activeDeviceId } = usePlayerStore.getState();
    const params: Record<string, string> = { state: String(!shuffleState) };
    if (activeDeviceId) params.device_id = activeDeviceId;
    try {
      await api.put("/v1/me/player/shuffle", undefined, params);
      usePlayerStore.getState().setShuffle(!shuffleState);
    } catch (err) {
      console.error("Failed to toggle shuffle:", err);
    }
  }, [api]);

  const toggleRepeat = useCallback(async () => {
    const { repeatState, activeDeviceId } = usePlayerStore.getState();
    const nextRepeat = { off: "context", context: "track", track: "off" } as const;
    const next = nextRepeat[repeatState];
    const params: Record<string, string> = { state: next };
    if (activeDeviceId) params.device_id = activeDeviceId;
    try {
      await api.put("/v1/me/player/repeat", undefined, params);
      usePlayerStore.getState().setRepeat(next);
    } catch (err) {
      console.error("Failed to toggle repeat:", err);
    }
  }, [api]);

  return {
    deviceId: deviceIdRef.current,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  };
}
