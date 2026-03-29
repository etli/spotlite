import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { ConfirmModal } from "../components/ConfirmModal";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyPlaylist, SpotifyPlaylistItem, SpotifyPaginated } from "../types/spotify";

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyPlaylistItem[]>([]);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const userId = useAuthStore((s) => s.userId);
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu({ playlistId: id });

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
    api.get<SpotifyPaginated<SpotifyPlaylistItem>>(`/v1/playlists/${id}/items`)
      .then((data) => setTracks(data.items.filter((item) => item.item != null))).catch(() => {});
  }, [id, api]);

  if (!playlist) return null;

  const isOwned = playlist.owner.id === userId;

  const playPlaylist = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: playlist.uri };
    if (trackUri) body.offset = { uri: trackUri };
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", body, params);
  };

  const handleRemoveTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((item) => item.item?.id !== trackId));
  };

  const handleDelete = async () => {
    try {
      await api.delete("/v1/me/library", { uris: [playlist.uri] });
      navigate("/");
    } catch (err) {
      console.error("Failed to delete playlist:", err);
      setShowDeleteConfirm(false);
    }
  };

  const imageUrl = playlist.images?.[0]?.url;

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
        {imageUrl && <img src={imageUrl} alt={playlist.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{playlist.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{playlist.owner?.display_name} · {playlist.items?.total ?? tracks.length} tracks</p>
          {playlist.description && <p className="text-xs text-[var(--color-text-muted)]">{playlist.description}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => playPlaylist()}
              className="w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
            >
              ▶ Play
            </button>
            {isOwned && (
              <>
                <button
                  onClick={() => setShowRename(true)}
                  className="w-fit rounded-full border border-[var(--theme-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
                >
                  Rename
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-fit rounded-full border border-red-400 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {tracks.map((item, i) => item.item && (
          <TrackRow
            key={`${item.item.id}-${i}`}
            track={item.item}
            index={i}
            isPlaying={currentTrack?.id === item.item.id}
            onPlay={() => playPlaylist(item.item!.uri)}
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
          playlistId={id}
          onRemoveTrack={() => handleRemoveTrack(menuState.track.id)}
        />
      )}

      {showRename && (
        <RenameModal
          playlist={playlist}
          api={api}
          onRenamed={(name) => {
            setPlaylist((prev) => prev ? { ...prev, name } : prev);
            setShowRename(false);
          }}
          onCancel={() => setShowRename(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={`Delete "${playlist.name}"?`}
          message="This will remove the playlist from your library. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// Rename uses PUT /playlists/{id} rather than POST /me/playlists,
// so we can't reuse CreatePlaylistModal directly. This is a thin wrapper
// that shares the same visual structure.
function RenameModal({
  playlist,
  api,
  onRenamed,
  onCancel,
}: {
  playlist: SpotifyPlaylist;
  api: ReturnType<typeof createSpotifyApi>;
  onRenamed: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(playlist.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.put(`/v1/playlists/${playlist.id}`, { name: trimmed });
      onRenamed(trimmed);
    } catch (err) {
      console.error("Failed to rename playlist:", err);
      setError("Failed to rename. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <form
        className="w-80 rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">Rename playlist</h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="mb-2 w-full rounded-xl border border-[var(--color-border)] bg-white/50 px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--theme-accent)]"
        />
        {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
        {!error && <div className="mb-4" />}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="rounded-full bg-[var(--theme-accent)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
