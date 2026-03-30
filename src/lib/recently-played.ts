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
    if (!entry.track) continue; // skip podcast episodes which have no track

    const playedAt = new Date(entry.played_at);

    const albumUri = (entry.track.album as { uri?: string } | undefined)?.uri;
    if (albumUri && !albums.has(albumUri)) {
      albums.set(albumUri, playedAt);
    }

    const ctxUri = entry.context?.type === "playlist" ? entry.context.uri : undefined;
    if (ctxUri && !playlists.has(ctxUri)) {
      playlists.set(ctxUri, playedAt);
    }

    for (const artist of entry.track.artists ?? []) {
      if (artist.id && !artists.has(artist.id)) {
        artists.set(artist.id, playedAt);
      }
    }
  }

  return { albums, playlists, artists };
}
