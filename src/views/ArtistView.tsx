import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyArtist, SpotifyTrack, SpotifyAlbumSimplified, SpotifyPaginated } from "../types/spotify";

export function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyArtist>(`/v1/artists/${id}`).then(setArtist).catch(() => {});
    api.get<{ tracks: SpotifyTrack[] }>(`/v1/artists/${id}/top-tracks`, { market: "from_token" })
      .then((data) => setTopTracks(data.tracks)).catch(() => {});
    api.get<SpotifyPaginated<SpotifyAlbumSimplified>>(`/v1/artists/${id}/albums`, {
      include_groups: "album,single,compilation", limit: "50",
    }).then((data) => setAlbums(data.items)).catch(() => {});
  }, [id]);

  if (!artist) return null;

  const playTrack = async (uri: string) => {
    await api.put("/v1/me/player/play", { uris: [uri] });
  };

  const imageUrl = artist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end gap-6">
        {imageUrl && <img src={imageUrl} alt={artist.name} className="glow h-48 w-48 shrink-0 rounded-full object-cover" />}
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">{artist.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{artist.followers.total.toLocaleString()} followers</p>
        </div>
      </div>
      {topTracks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Top Tracks</h2>
          <div className="flex flex-col">
            {topTracks.slice(0, 5).map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} isPlaying={currentTrack?.id === track.id}
                onPlay={() => playTrack(track.uri)} />
            ))}
          </div>
        </section>
      )}
      {albums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Discography</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
                subtitle={`${album.release_date.split("-")[0]} · ${album.album_type}`} linkTo={`/album/${album.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
