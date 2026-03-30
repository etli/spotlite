import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TrackContextMenu } from "../TrackContextMenu";
import type { SpotifyTrack } from "../../types/spotify";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0, next: null }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

vi.mock("../../store/toast-store", () => ({
  useToastStore: { getState: () => ({ push: vi.fn() }) },
}));

const track: SpotifyTrack = {
  id: "t1",
  name: "Test Song",
  uri: "spotify:track:t1",
  duration_ms: 180000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
  album: {
    id: "al1", name: "Album", images: [], artists: [],
    release_date: "2024-01-01", total_tracks: 10,
    uri: "spotify:album:al1", album_type: "album",
  },
};

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <TrackContextMenu track={track} x={100} y={100} onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe("TrackContextMenu", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders Add to playlist, Go to artist, Go to album items", () => {
    renderMenu();
    expect(screen.getByText("Add to playlist")).toBeInTheDocument();
    expect(screen.getByText("Go to artist")).toBeInTheDocument();
    expect(screen.getByText("Go to album")).toBeInTheDocument();
  });

  it("does not render Remove from playlist when playlistId is not set", () => {
    renderMenu();
    expect(screen.queryByText("Remove from playlist")).not.toBeInTheDocument();
  });

  it("renders Remove from playlist when playlistId is provided", () => {
    renderMenu({ playlistId: "pl1", onRemoveTrack: vi.fn() });
    expect(screen.getByText("Remove from playlist")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking outside the menu", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows playlist flyout on mouseenter of Add to playlist item", async () => {
    renderMenu();
    const addToPlaylistItem = screen.getByText("Add to playlist").closest("div")!;
    fireEvent.mouseEnter(addToPlaylistItem);
    // The flyout renders a "Liked Songs" button (hardcoded)
    expect(await screen.findByText(/Liked Songs/)).toBeInTheDocument();
  });
});
