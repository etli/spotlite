import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryView } from "../LibraryView";

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

describe("LibraryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Playlists, Albums, and Artists tabs", () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: "Playlists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Albums" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artists" })).toBeInTheDocument();
  });

  it("does not render a Liked Songs tab button", () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(screen.queryByRole("button", { name: "Liked Songs" })).not.toBeInTheDocument();
  });

  it("shows the Liked Songs card in the Playlists tab", () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(screen.getByText("Liked Songs")).toBeInTheDocument();
  });
});
