import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyAlbumFull } from "../types/spotify";

export function AlbumDetailView() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<SpotifyAlbumFull | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyAlbumFull>(`/v1/albums/${id}`).then(setAlbum).catch(() => {});
  }, [id]);

  if (!album) return null;

  const playAlbum = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: album.uri };
    if (trackUri) body.offset = { uri: trackUri };
    await api.put("/v1/me/player/play", body);
  };

  const imageUrl = album.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={album.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{album.album_type}</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{album.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {album.artists.map((a) => (<Link key={a.id} to={`/artist/${a.id}`} className="hover:underline">{a.name}</Link>))}
            {" · "}{album.release_date.split("-")[0]}{" · "}{album.total_tracks} tracks
          </p>
          <button onClick={() => playAlbum()}
            className="mt-2 w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105">
            ▶ Play
          </button>
        </div>
      </div>
      <div className="flex flex-col">
        {album.tracks.items.map((track, i) => (
          <TrackRow key={track.id} track={{ ...track, album }} index={i}
            isPlaying={currentTrack?.id === track.id} onPlay={() => playAlbum(track.uri)} />
        ))}
      </div>
    </div>
  );
}
