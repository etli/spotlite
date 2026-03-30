import { useState, useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import { CreatePlaylistModal } from "../components/CreatePlaylistModal";
import type { SpotifyPlaylist, SpotifyAlbumSimplified, SpotifyArtist, SpotifyPaginated } from "../types/spotify";

type Tab = "playlists" | "albums" | "artists";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [likedCount, setLikedCount] = useState<number | null>(null);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const ignore = (err: unknown) => { if ((err as { name?: string }).name !== "AbortError") console.error(err); };

    if (activeTab === "playlists") {
      api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" }, signal)
        .then((data) => setPlaylists(data.items.filter((pl) => pl != null))).catch(ignore);
      if (likedCount === null) {
        api.get<SpotifyPaginated<unknown>>("/v1/me/tracks", { limit: "1" }, signal)
          .then((data) => setLikedCount(data.total)).catch(ignore);
      }
    } else if (activeTab === "albums") {
      api.get<SpotifyPaginated<{ album: SpotifyAlbumSimplified }>>("/v1/me/albums", { limit: "50" }, signal)
        .then((data) => setAlbums(data.items.map((i) => i.album))).catch(ignore);
    } else if (activeTab === "artists") {
      api.get<{ artists: SpotifyPaginated<SpotifyArtist> }>("/v1/me/following", { type: "artist", limit: "50" }, signal)
        .then((data) => setArtists(data.artists.items)).catch(ignore);
    }
    return () => controller.abort();
  }, [activeTab, api]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "artists", label: "Artists" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`border px-4 py-1.5 text-[9px] transition-all ${
              activeTab === tab.key
                ? "border-[var(--color-border)] bg-[var(--theme-accent)] text-white shadow-[2px_2px_0_var(--theme-shadow)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            }`}>{tab.label}</button>
        ))}
        {activeTab === "playlists" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-auto border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-[9px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            + New
          </button>
        )}
      </div>

      {activeTab === "playlists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Link
            to="/liked"
            className="group flex flex-col gap-2 border border-transparent p-3 transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[2px_2px_0_var(--theme-shadow)]"
          >
            <div className="aspect-square overflow-hidden border border-[var(--color-border)] bg-[var(--theme-primary)] flex items-center justify-center">
              <Heart size={32} strokeLinecap="square" strokeLinejoin="miter" className="text-white" />
            </div>
            <div className="min-w-0 px-1">
              <p className="truncate text-[9px] font-medium text-[var(--color-text-primary)]">Liked Songs</p>
              <p className="truncate text-[7px] text-[var(--color-text-secondary)]">{likedCount !== null ? `${likedCount} tracks` : ""}</p>
            </div>
          </Link>
          {playlists.map((pl) => (
            <AlbumCard key={pl.id} id={pl.id} name={pl.name} imageUrl={pl.images?.[0]?.url}
              subtitle={`${pl.items?.total ?? 0} tracks`} linkTo={`/playlist/${pl.id}`} />
          ))}
        </div>
      )}

      {activeTab === "albums" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
              subtitle={album.artists.map((a) => a.name).join(", ")} linkTo={`/album/${album.id}`} />
          ))}
        </div>
      )}

      {activeTab === "artists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {artists.map((artist) => (
            <AlbumCard key={artist.id} id={artist.id} name={artist.name} imageUrl={artist.images?.[0]?.url}
              subtitle={artist.genres?.[0] ?? ""} linkTo={`/artist/${artist.id}`} />
          ))}
        </div>
      )}
      {showCreateModal && (
        <CreatePlaylistModal
          onCreated={(playlist) => {
            setPlaylists((prev) => [playlist, ...prev]);
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
