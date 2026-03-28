import { describe, it, expect, beforeEach } from "vitest";
import { usePlayerStore } from "../player-store";

describe("player-store", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null, isPlaying: false, progressMs: 0, durationMs: 0,
      shuffleState: false, repeatState: "off", volume: 50,
      activeDeviceId: null, activeDeviceName: null, isLocalPlayback: true,
    });
  });

  it("starts with no track playing", () => {
    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it("setTrack updates current track and duration", () => {
    const track = {
      id: "1", name: "Test Song", uri: "spotify:track:1", duration_ms: 200000, track_number: 1,
      artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
      album: { id: "al1", name: "Album", images: [{ url: "https://img.jpg", height: 300, width: 300 }],
        artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
        release_date: "2024", total_tracks: 10, uri: "spotify:album:al1", album_type: "album" as const },
    };
    usePlayerStore.getState().setTrack(track);
    expect(usePlayerStore.getState().currentTrack?.name).toBe("Test Song");
    expect(usePlayerStore.getState().durationMs).toBe(200000);
  });

  it("setPlaybackState updates playing and progress", () => {
    usePlayerStore.getState().setPlaybackState(true, 50000);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().progressMs).toBe(50000);
  });

  it("setDevice updates active device info", () => {
    usePlayerStore.getState().setDevice("dev1", "Kitchen Speaker", false);
    expect(usePlayerStore.getState().activeDeviceId).toBe("dev1");
    expect(usePlayerStore.getState().activeDeviceName).toBe("Kitchen Speaker");
    expect(usePlayerStore.getState().isLocalPlayback).toBe(false);
  });
});
