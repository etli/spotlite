import { useState, useEffect } from "react";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyPlaylist, SpotifyAlbumSimplified, SpotifyTrack, SpotifyPaginated } from "../types/spotify";
import { TrackRow } from "../components/TrackRow";
import { usePlayerStore } from "../store/player-store";

type Tab = "playlists" | "albums" | "liked";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (activeTab === "playlists") {
      api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
        .then((data) => setPlaylists(data.items)).catch(() => {});
    } else if (activeTab === "albums") {
      api.get<SpotifyPaginated<{ album: SpotifyAlbumSimplified }>>("/v1/me/albums", { limit: "50" })
        .then((data) => setAlbums(data.items.map((i) => i.album))).catch(() => {});
    } else if (activeTab === "liked") {
      api.get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", { limit: "50" })
        .then((data) => setLikedSongs(data.items.map((i) => i.track))).catch(() => {});
    }
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "liked", label: "Liked Songs" },
  ];

  const playTrack = async (uri: string, contextUri?: string) => {
    const body: Record<string, unknown> = {};
    if (contextUri) { body.context_uri = contextUri; body.offset = { uri }; }
    else { body.uris = [uri]; }
    await api.put("/v1/me/player/play", body);
  };

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
          {playlists.map((pl) => (
            <AlbumCard key={pl.id} id={pl.id} name={pl.name} imageUrl={pl.images?.[0]?.url}
              subtitle={`${pl.tracks.total} tracks`} linkTo={`/playlist/${pl.id}`} />
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
      {activeTab === "liked" && (
        <div className="flex flex-col">
          {likedSongs.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} isPlaying={currentTrack?.id === track.id}
              onPlay={() => playTrack(track.uri)} />
          ))}
        </div>
      )}
    </div>
  );
}
