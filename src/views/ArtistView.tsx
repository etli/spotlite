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

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyArtist>(`/v1/artists/${id}`).then(setArtist).catch(() => {});
    const market = useAuthStore.getState().country;
    api.get<SpotifyPaginated<SpotifyAlbumSimplified>>(`/v1/artists/${id}/albums`, {
      include_groups: "album,single,compilation", market,
    }).then((data) => setAlbums(data.items)).catch(() => {});
  }, [id, api]);

  if (!artist) return null;

  const imageUrl = artist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-8">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ←
      </button>
      <div className="flex items-end gap-6">
        {imageUrl && <img src={imageUrl} alt={artist.name} className="glow h-48 w-48 shrink-0 rounded-full object-cover" />}
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">{artist.name}</h1>
          {artist.followers && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{artist.followers.total.toLocaleString()} followers</p>
          )}
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
