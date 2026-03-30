import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import type { SpotifyPlaylist } from "../types/spotify";

interface CreatePlaylistModalProps {
  initialName?: string;
  submitLabel?: string;
  onCreated: (playlist: SpotifyPlaylist) => void;
  onCancel: () => void;
}

export function CreatePlaylistModal({
  initialName = "",
  submitLabel = "Create",
  onCreated,
  onCancel,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState(initialName);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = await api.post<SpotifyPlaylist>("/v1/me/playlists", { name: trimmed, public: false });
    onCreated(playlist);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <form
        className="w-80 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[2px_2px_0_var(--theme-shadow)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-[10px] text-[var(--color-text-primary)]">
          {submitLabel === "Save" ? "Rename playlist" : "New playlist"}
        </h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="mb-6 w-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-[8px] text-[var(--color-text-primary)] outline-none focus:border-[var(--theme-primary)] focus:shadow-[2px_2px_0_var(--theme-shadow)]"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[var(--color-border)] px-4 py-1.5 text-[8px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="border border-[var(--color-border)] bg-[var(--theme-accent)] px-4 py-1.5 text-[8px] font-medium text-white shadow-[2px_2px_0_var(--theme-shadow)] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
