import { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import type { SpotifyTrack, SpotifyPlaylist, SpotifyPaginated } from "../types/spotify";

interface TrackContextMenuProps {
  track: SpotifyTrack;
  x: number;
  y: number;
  onClose: () => void;
  playlistId?: string;
  onRemoveTrack?: () => void;
}

function PlaylistFlyout({
  track,
  api,
  onClose,
  onCreatePlaylist,
}: {
  track: SpotifyTrack;
  api: ReturnType<typeof createSpotifyApi>;
  onClose: () => void;
  onCreatePlaylist: () => void;
}) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  useEffect(() => {
    api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
      .then((data) => setPlaylists(data.items.filter(Boolean)))
      .catch((err) => { console.error("Failed to load playlists:", err); });
  }, [api]);

  const addToPlaylist = async (playlistId: string) => {
    try {
      await api.post(`/v1/playlists/${playlistId}/items`, { uris: [track.uri] });
      onClose();
    } catch (err) {
      console.error("Failed to add track to playlist:", err);
    }
  };

  const addToLikedSongs = async () => {
    try {
      await api.put("/v1/me/library", undefined, { uris: track.uri });
      onClose();
    } catch (err) {
      console.error("Failed to add track to Liked Songs:", err);
    }
  };

  return (
    <div className="absolute left-full top-0 w-48 rounded-xl border border-white/40 bg-white/90 py-1 shadow-2xl backdrop-blur-md">
      <button
        onClick={addToLikedSongs}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
      >
        <span>💜</span> Liked Songs
      </button>
      {playlists.map((pl) => (
        <button
          key={pl.id}
          onClick={() => addToPlaylist(pl.id)}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          <span>🎵</span>
          <span className="truncate">{pl.name}</span>
        </button>
      ))}
      <div className="my-1 border-t border-white/30" />
      <button
        onClick={onCreatePlaylist}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--theme-accent)] hover:bg-white/50"
      >
        <span>+</span> New playlist
      </button>
    </div>
  );
}

export function TrackContextMenu({
  track,
  x,
  y,
  onClose,
  playlistId,
  onRemoveTrack,
}: TrackContextMenuProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Clamp position to viewport
  const clampedX = Math.min(x, window.innerWidth - 200);
  const clampedY = Math.min(y, window.innerHeight - 200);

  const handleGoToArtist = () => {
    navigate(`/artist/${track.artists[0].id}`);
    onClose();
  };

  const handleGoToAlbum = () => {
    navigate(`/album/${track.album.id}`);
    onClose();
  };

  const handleRemove = async () => {
    if (!playlistId) return;
    try {
      await api.delete(`/v1/playlists/${playlistId}/items`, undefined, { uris: track.uri });
      onRemoveTrack?.();
      onClose();
    } catch (err) {
      console.error("Failed to remove track:", err);
    }
  };

  const handleCreatePlaylistModal = () => {
    setFlyoutOpen(false);
    setShowCreateModal(true);
  };

  const handlePlaylistCreated = async (playlist: SpotifyPlaylist) => {
    try {
      await api.post(`/v1/playlists/${playlist.id}/items`, { uris: [track.uri] });
      setShowCreateModal(false);
      onClose();
    } catch (err) {
      console.error("Failed to add track to playlist:", err);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div
        ref={menuRef}
        style={{ position: "fixed", left: clampedX, top: clampedY, zIndex: 9999 }}
        className="w-48 rounded-xl border border-white/40 bg-white/90 py-1 shadow-2xl backdrop-blur-md"
      >
        {/* Add to playlist */}
        <div
          className="relative"
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          <button
            onClick={() => setFlyoutOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
          >
            Add to playlist <span className="text-xs text-[var(--color-text-muted)]">▶</span>
          </button>
          {flyoutOpen && (
            <PlaylistFlyout
              track={track}
              api={api}
              onClose={onClose}
              onCreatePlaylist={handleCreatePlaylistModal}
            />
          )}
        </div>

        <div className="my-1 border-t border-white/30" />

        <button
          onClick={handleGoToArtist}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          Go to artist
        </button>
        <button
          onClick={handleGoToAlbum}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          Go to album
        </button>

        {playlistId && (
          <>
            <div className="my-1 border-t border-white/30" />
            <button
              onClick={handleRemove}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-500 hover:bg-white/50"
            >
              Remove from playlist
            </button>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          onCreated={handlePlaylistCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>,
    document.body
  );
}
