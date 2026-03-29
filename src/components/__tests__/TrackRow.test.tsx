import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrackRow } from "../TrackRow";
import type { SpotifyTrack } from "../../types/spotify";

const track: SpotifyTrack = {
  id: "t1",
  name: "Test Song",
  uri: "spotify:track:t1",
  duration_ms: 180000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
  album: {
    id: "al1",
    name: "Album",
    images: [],
    artists: [],
    release_date: "2024-01-01",
    total_tracks: 10,
    uri: "spotify:album:al1",
    album_type: "album",
  },
};

describe("TrackRow", () => {
  it("calls onContextMenu with track and event on right-click", () => {
    const onContextMenu = vi.fn();
    render(
      <TrackRow
        track={track}
        index={0}
        isPlaying={false}
        onPlay={vi.fn()}
        onContextMenu={onContextMenu}
      />
    );
    const row = screen.getByRole("button");
    fireEvent.contextMenu(row);
    expect(onContextMenu).toHaveBeenCalledWith(track, expect.any(Object));
  });

  it("does not throw on right-click when onContextMenu is not provided", () => {
    render(
      <TrackRow
        track={track}
        index={0}
        isPlaying={false}
        onPlay={vi.fn()}
      />
    );
    expect(() => fireEvent.contextMenu(screen.getByRole("button"))).not.toThrow();
  });
});
