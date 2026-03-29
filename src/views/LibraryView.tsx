import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyPlaylist, SpotifyAlbumSimplified, SpotifyArtist, SpotifyPaginated } from "../types/spotify";

type Tab = "playlists" | "albums" | "artists";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (activeTab === "playlists") {
      api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
        .then((data) => setPlaylists(data.items.filter((pl) => pl != null))).catch(() => {});
    } else if (activeTab === "albums") {
      api.get<SpotifyPaginated<{ album: SpotifyAlbumSimplified }>>("/v1/me/albums", { limit: "50" })
        .then((data) => setAlbums(data.items.map((i) => i.album))).catch(() => {});
    } else if (activeTab === "artists") {
      api.get<{ artists: SpotifyPaginated<SpotifyArtist> }>("/v1/me/following", { type: "artist", limit: "50" })
        .then((data) => setArtists(data.artists.items)).catch(() => {});
    }
  }, [activeTab, api]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "artists", label: "Artists" },
  ];

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-all ${
              activeTab === tab.key
                ? "bg-[var(--theme-accent)] text-white shadow-md"
                : "bg-white/30 text-[var(--color-text-secondary)] hover:bg-white/50"
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "playlists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Link to="/liked" className="group flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 p-3 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg">
            <div className="flex aspect-square items-center justify-center rounded-xl text-4xl">💜</div>
            <div className="px-1">
              <p className="truncate text-sm font-medium text-white">Liked Songs</p>
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
              subtitle={`${(artist.followers?.total ?? 0).toLocaleString()} followers`} linkTo={`/artist/${artist.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
