import type { SpotifyPlayHistory } from "../types/spotify";

export interface PlayedAtMaps {
  albums: Map<string, Date>;
  playlists: Map<string, Date>;
  artists: Map<string, Date>;
}

/**
 * Builds lookup maps of URI/ID → most recent played_at date from Spotify history.
 * The API returns items newest-first, so the first occurrence of each key is kept.
 */
export function buildPlayedAtMaps(history: SpotifyPlayHistory[]): PlayedAtMaps {
  const albums = new Map<string, Date>();
  const playlists = new Map<string, Date>();
  const artists = new Map<string, Date>();

  for (const entry of history) {
    const playedAt = new Date(entry.played_at);

    if (!albums.has(entry.track.album.uri)) {
      albums.set(entry.track.album.uri, playedAt);
    }

    if (entry.context?.type === "playlist" && !playlists.has(entry.context.uri)) {
      playlists.set(entry.context.uri, playedAt);
    }

    for (const artist of entry.track.artists) {
      if (!artists.has(artist.id)) {
        artists.set(artist.id, playedAt);
      }
    }
  }

  return { albums, playlists, artists };
}
