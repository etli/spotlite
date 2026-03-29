import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyAlbumFull } from "../types/spotify";

export function AlbumDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [album, setAlbum] = useState<SpotifyAlbumFull | null>(null);
  const [saved, setSaved] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyAlbumFull>(`/v1/albums/${id}`).then((data) => {
      setAlbum(data);
      api.get<boolean[]>("/v1/me/library/contains", { uris: data.uri })
        .then((results) => setSaved(results[0] ?? false))
        .catch(() => {});
    }).catch(() => {});
  }, [id, api]);

  if (!album) return null;

  const playAlbum = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: album.uri };
    if (trackUri) body.offset = { uri: trackUri };
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", body, params);
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await api.put("/v1/me/library", undefined, { uris: album.uri });
      } else {
        await api.delete("/v1/me/library", undefined, { uris: album.uri });
      }
    } catch {
      setSaved(!next);
    }
  };

  const imageUrl = album.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ← Back
      </button>
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={album.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{album.album_type}</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{album.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {album.artists.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link to={`/artist/${a.id}`} className="hover:underline">{a.name}</Link>
              </span>
            ))}
            {" · "}{album.release_date.split("-")[0]}{" · "}{album.total_tracks} tracks
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => playAlbum()}
              className="w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
            >
              ▶ Play
            </button>
            <button
              onClick={toggleSave}
              className="w-fit rounded-full border border-[var(--theme-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
            >
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {album.tracks.items.map((track, i) => (
          <TrackRow
            key={track.id}
            track={{ ...track, album }}
            index={i}
            isPlaying={currentTrack?.id === track.id}
            onPlay={() => playAlbum(track.uri)}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {menuState && (
        <TrackContextMenu
          track={menuState.track}
          x={menuState.x}
          y={menuState.y}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
