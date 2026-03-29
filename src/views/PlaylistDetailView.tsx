import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyPlaylist, SpotifyPlaylistItem, SpotifyPaginated } from "../types/spotify";

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyPlaylistItem[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
    api.get<SpotifyPaginated<SpotifyPlaylistItem>>(`/v1/playlists/${id}/items`)
      .then((data) => setTracks(data.items.filter((item) => item.item != null))).catch(() => {});
  }, [id]);

  if (!playlist) return null;

  const playPlaylist = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: playlist.uri };
    if (trackUri) body.offset = { uri: trackUri };
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", body, params);
  };

  const imageUrl = playlist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={playlist.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{playlist.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{playlist.owner?.display_name} · {playlist.items?.total ?? tracks.length} tracks</p>
          {playlist.description && <p className="text-xs text-[var(--color-text-muted)]">{playlist.description}</p>}
          <button onClick={() => playPlaylist()}
            className="mt-2 w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105">
            ▶ Play
          </button>
        </div>
      </div>
      <div className="flex flex-col">
        {tracks.map((item, i) => item.item && (
          <TrackRow key={`${item.item.id}-${i}`} track={item.item} index={i}
            isPlaying={currentTrack?.id === item.item.id} onPlay={() => playPlaylist(item.item!.uri)} />
        ))}
      </div>
    </div>
  );
}
