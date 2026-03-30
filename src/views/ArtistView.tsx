import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyArtist, SpotifyAlbumSimplified, SpotifyPaginated } from "../types/spotify";

export function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [following, setFollowing] = useState(false);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyArtist>(`/v1/artists/${id}`).then((data) => {
      setArtist(data);
      api.get<boolean[]>("/v1/me/library/contains", { uris: data.uri })
        .then((results) => setFollowing(results[0] ?? false))
        .catch(() => {});
    }).catch(() => {});
    const market = useAuthStore.getState().country;
    api.get<SpotifyPaginated<SpotifyAlbumSimplified>>(`/v1/artists/${id}/albums`, {
      include_groups: "album,single,compilation", market,
    }).then((data) => setAlbums(data.items)).catch(() => {});
  }, [id, api]);

  if (!artist) return null;

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await api.put("/v1/me/library", undefined, { uris: artist.uri });
      } else {
        await api.delete("/v1/me/library", undefined, { uris: artist.uri });
      }
    } catch {
      setFollowing(!next);
    }
  };

  const imageUrl = artist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-8">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center gap-2 text-[9px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <span className="text-[14px]">←</span> Back
      </button>
      <div className="flex items-end gap-6">
        {imageUrl && <img src={imageUrl} alt={artist.name} className="glow h-48 w-48 shrink-0 rounded-full object-cover" />}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">{artist.name}</h1>
          <button
            onClick={toggleFollow}
            className="w-fit border border-[var(--theme-accent)] px-4 py-1.5 text-[9px] font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
          >
            {following ? "Following ✓" : "Follow"}
          </button>
        </div>
      </div>
      {albums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Discography</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
                subtitle={`${album.release_date.split("-")[0]} · ${album.album_type}`} linkTo={`/album/${album.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
