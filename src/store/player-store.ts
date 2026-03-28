import { create } from "zustand";
import type { SpotifyTrack } from "../types/spotify";

interface PlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  shuffleState: boolean;
  repeatState: "off" | "context" | "track";
  volume: number;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  isLocalPlayback: boolean;
  setTrack: (track: SpotifyTrack | null) => void;
  setPlaybackState: (isPlaying: boolean, progressMs: number) => void;
  setDevice: (id: string | null, name: string | null, isLocal: boolean) => void;
  setShuffle: (state: boolean) => void;
  setRepeat: (state: "off" | "context" | "track") => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null, isPlaying: false, progressMs: 0, durationMs: 0,
  shuffleState: false, repeatState: "off", volume: 50,
  activeDeviceId: null, activeDeviceName: null, isLocalPlayback: true,
  setTrack: (track) => set({ currentTrack: track, durationMs: track?.duration_ms ?? 0 }),
  setPlaybackState: (isPlaying, progressMs) => set({ isPlaying, progressMs }),
  setDevice: (id, name, isLocal) => set({ activeDeviceId: id, activeDeviceName: name, isLocalPlayback: isLocal }),
  setShuffle: (shuffleState) => set({ shuffleState }),
  setRepeat: (repeatState) => set({ repeatState }),
  setVolume: (volume) => set({ volume }),
}));
