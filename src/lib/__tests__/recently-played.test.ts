import { describe, it, expect } from "vitest";
import { buildPlayedAtMaps } from "../recently-played";
import type { SpotifyPlayHistory } from "../../types/spotify";

const baseTrack: SpotifyPlayHistory["track"] = {
  id: "t1",
  name: "Track",
  uri: "spotify:track:t1",
  duration_ms: 200000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist One", uri: "spotify:artist:a1" }],
  album: {
    id: "al1", name: "Album", images: [],
    artists: [{ id: "a1", name: "Artist One", uri: "spotify:artist:a1" }],
    release_date: "2024", total_tracks: 10,
    uri: "spotify:album:al1", album_type: "album",
  },
};

const makeEntry = (overrides: Partial<SpotifyPlayHistory>): SpotifyPlayHistory => ({
  track: baseTrack,
  played_at: "2024-01-01T00:00:00Z",
  context: null,
  ...overrides,
});

describe("buildPlayedAtMaps", () => {
  it("returns empty maps for empty history", () => {
    const { albums, playlists, artists } = buildPlayedAtMaps([]);
    expect(albums.size).toBe(0);
    expect(playlists.size).toBe(0);
    expect(artists.size).toBe(0);
  });

  it("maps album URI to played_at date", () => {
    const { albums } = buildPlayedAtMaps([makeEntry({ played_at: "2024-06-15T10:00:00Z" })]);
    expect(albums.get("spotify:album:al1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("maps playlist context URI to played_at date", () => {
    const { playlists } = buildPlayedAtMaps([
      makeEntry({
        played_at: "2024-06-15T10:00:00Z",
        context: { type: "playlist", uri: "spotify:playlist:p1" },
      }),
    ]);
    expect(playlists.get("spotify:playlist:p1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("maps artist ID to played_at date", () => {
    const { artists } = buildPlayedAtMaps([makeEntry({ played_at: "2024-06-15T10:00:00Z" })]);
    expect(artists.get("a1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("keeps the most recent played_at when the same album appears multiple times (API is newest-first)", () => {
    const history = [
      makeEntry({ played_at: "2024-06-20T00:00:00Z" }),
      makeEntry({ played_at: "2024-06-01T00:00:00Z" }),
    ];
    const { albums } = buildPlayedAtMaps(history);
    expect(albums.get("spotify:album:al1")).toEqual(new Date("2024-06-20T00:00:00Z"));
  });

  it("does not add to playlists map for non-playlist contexts", () => {
    const { playlists } = buildPlayedAtMaps([
      makeEntry({ context: { type: "album", uri: "spotify:album:al1" } }),
    ]);
    expect(playlists.size).toBe(0);
  });

  it("maps all artists from a multi-artist track", () => {
    const multiArtistTrack: SpotifyPlayHistory["track"] = {
      ...baseTrack,
      artists: [
        { id: "a1", name: "Artist One", uri: "spotify:artist:a1" },
        { id: "a2", name: "Artist Two", uri: "spotify:artist:a2" },
      ],
    };
    const { artists } = buildPlayedAtMaps([makeEntry({ track: multiArtistTrack })]);
    expect(artists.has("a1")).toBe(true);
    expect(artists.has("a2")).toBe(true);
  });

  it("does not add to playlists map when context is null", () => {
    const { playlists } = buildPlayedAtMaps([makeEntry({ context: null })]);
    expect(playlists.size).toBe(0);
  });
});
