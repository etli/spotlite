import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifyTrack } from "../types/spotify";

const DEVICE_NAME = "Spotlite";

export function usePlayback() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const { setTrack, setPlaybackState, setDevice, setShuffle, setRepeat } = usePlayerStore();

  useEffect(() => {
    if (!accessToken) return;
    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: DEVICE_NAME,
        getOAuthToken: (cb) => { const token = useAuthStore.getState().accessToken; if (token) cb(token); },
        volume: usePlayerStore.getState().volume / 100,
      });
      player.addListener("ready", ({ device_id }) => { deviceIdRef.current = device_id; setDevice(device_id, DEVICE_NAME, true); });
      player.addListener("not_ready", () => { deviceIdRef.current = null; });
      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const track = state.track_window.current_track;
        const spotifyTrack: SpotifyTrack = {
          id: track.id, name: track.name, uri: track.uri, duration_ms: track.duration_ms, track_number: 1,
          artists: track.artists.map((a) => ({ id: a.uri.split(":")[2], name: a.name, uri: a.uri })),
          album: {
            id: track.album.uri.split(":")[2], name: track.album.name, images: track.album.images,
            artists: [], release_date: "", total_tracks: 0, uri: track.album.uri, album_type: "album",
          },
        };
        setTrack(spotifyTrack);
        setPlaybackState(!state.paused, state.position);
        setShuffle(state.shuffle);
        const repeatMap = { 0: "off", 1: "context", 2: "track" } as const;
        setRepeat(repeatMap[state.repeat_mode]);
      });
      player.connect();
      playerRef.current = player;
    };
    if (window.Spotify) initPlayer();
    else window.onSpotifyWebPlaybackSDKReady = initPlayer;
    return () => { playerRef.current?.disconnect(); playerRef.current = null; };
  }, [accessToken, setTrack, setPlaybackState, setDevice, setShuffle, setRepeat]);

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
  const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
  const seek = useCallback((ms: number) => playerRef.current?.seek(ms), []);
  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol / 100);
    usePlayerStore.getState().setVolume(vol);
  }, []);

  return { deviceId: deviceIdRef.current, togglePlay, nextTrack, previousTrack, seek, setVolume };
}
