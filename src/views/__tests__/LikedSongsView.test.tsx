import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LikedSongsView } from "../LikedSongsView";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0, next: null }),
    put: vi.fn(),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

vi.mock("../../store/player-store", () => ({
  usePlayerStore: Object.assign(
    (selector: (s: { currentTrack: null }) => unknown) => selector({ currentTrack: null }),
    { getState: () => ({ activeDeviceId: null }) }
  ),
}));

describe("LikedSongsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Liked Songs heading", () => {
    render(
      <MemoryRouter>
        <LikedSongsView />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Liked Songs" })).toBeInTheDocument();
  });
});
