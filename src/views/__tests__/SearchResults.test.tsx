import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchResults } from "../SearchResults";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({}),
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

describe("SearchResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when query is empty", () => {
    render(
      <MemoryRouter>
        <SearchResults query="" />
      </MemoryRouter>
    );
    expect(screen.getByText("Search for your favorite music")).toBeInTheDocument();
  });
});
