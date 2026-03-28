import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyPlaylist, SpotifyPlaylistTrackItem, SpotifyPaginated } from "../types/spotify";

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyPlaylistTrackItem[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
    api.get<SpotifyPaginated<SpotifyPlaylistTrackItem>>(`/v1/playlists/${id}/tracks`, { limit: "100" })
      .then((data) => setTracks(data.items)).catch(() => {});
  }, [id]);

  if (!playlist) return null;

  const playPlaylist = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: playlist.uri };
    if (trackUri) body.offset = { uri: trackUri };
    await api.put("/v1/me/player/play", body);
  };

  const imageUrl = playlist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={playlist.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{playlist.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{playlist.owner.display_name} · {playlist.tracks.total} tracks</p>
          {playlist.description && <p className="text-xs text-[var(--color-text-muted)]">{playlist.description}</p>}
          <button onClick={() => playPlaylist()}
            className="mt-2 w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105">
            ▶ Play
          </button>
        </div>
      </div>
      <div className="flex flex-col">
        {tracks.map((item, i) => item.track && (
          <TrackRow key={`${item.track.id}-${i}`} track={item.track} index={i}
            isPlaying={currentTrack?.id === item.track.id} onPlay={() => playPlaylist(item.track!.uri)} />
        ))}
      </div>
    </div>
  );
}
