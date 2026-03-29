import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchResults } from "../SearchResults";

const mockGet = vi.fn().mockResolvedValue({});
const mockPut = vi.fn();

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: vi.fn(() => ({
    get: mockGet,
    put: mockPut,
  })),
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
    mockGet.mockResolvedValue({});
  });

  it("shows empty state when query is empty", () => {
    render(
      <MemoryRouter>
        <SearchResults query="" />
      </MemoryRouter>
    );
    expect(screen.getByText("Search for your favorite music")).toBeInTheDocument();
  });

  it("does not show follower count for artists in results", async () => {
    mockGet.mockResolvedValueOnce({
      artists: {
        items: [
          { id: "a1", name: "Test Artist", images: [], followers: { total: 999 }, genres: ["pop"] },
        ],
      },
      tracks: { items: [] },
      albums: { items: [] },
    });

    render(
      <MemoryRouter>
        <SearchResults query="test" />
      </MemoryRouter>
    );

    await screen.findByText("Test Artist");
    expect(screen.queryByText(/followers/i)).not.toBeInTheDocument();
  });

  it("calls onNavigate when an album card is clicked", async () => {
    const onNavigate = vi.fn();
    mockGet.mockResolvedValueOnce({
      albums: {
        items: [
          { id: "alb1", name: "Test Album", images: [], artists: [{ name: "Artist" }] },
        ],
      },
      tracks: { items: [] },
      artists: { items: [] },
    });

    render(
      <MemoryRouter>
        <SearchResults query="test" onNavigate={onNavigate} />
      </MemoryRouter>
    );

    const albumLink = await screen.findByRole("link", { name: /test album/i });
    fireEvent.click(albumLink);
    expect(onNavigate).toHaveBeenCalled();
  });
});
