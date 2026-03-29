import { useState, useEffect } from "react";
import { AlbumCard } from "../components/AlbumCard";
import { TrackRow } from "../components/TrackRow";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifySearchResult } from "../types/spotify";

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<SpotifySearchResult | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await api.get<SpotifySearchResult>("/v1/search", {
          q: query.trim(),
          type: "track,album,artist",
        });
        setResults(data);
      } catch {
        // Silently ignore errors
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const playTrack = async (uri: string) => {
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", { uris: [uri] }, params);
  };

  return (
    <div className="flex flex-col gap-6">
      {results?.tracks && results.tracks.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Tracks</h2>
          <div className="flex flex-col">
            {results.tracks.items.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isPlaying={currentTrack?.id === track.id}
                onPlay={() => playTrack(track.uri)}
              />
            ))}
          </div>
        </section>
      )}
      {results?.albums && results.albums.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Albums</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.albums.items.map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                name={album.name}
                imageUrl={album.images?.[0]?.url}
                subtitle={album.artists.map((a) => a.name).join(", ")}
                linkTo={`/album/${album.id}`}
              />
            ))}
          </div>
        </section>
      )}
      {results?.artists && results.artists.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Artists</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.artists.items.map((artist) => (
              <AlbumCard
                key={artist.id}
                id={artist.id}
                name={artist.name}
                imageUrl={artist.images?.[0]?.url}
                subtitle={`${(artist.followers?.total ?? 0).toLocaleString()} followers`}
                linkTo={`/artist/${artist.id}`}
              />
            ))}
          </div>
        </section>
      )}
      {!results && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
          <span className="mb-2 text-4xl">🔍</span>
          <p className="text-sm">Search for your favorite music</p>
        </div>
      )}
    </div>
  );
}
