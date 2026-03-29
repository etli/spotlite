import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyTrack, SpotifyPaginated } from "../types/spotify";

export function LikedSongsView() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const navigate = useNavigate();
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    api.get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", { limit: "50" })
      .then((data) => {
        setTracks(data.items.map((i) => i.track));
        setTotal(data.total);
      })
      .catch(() => {});
  }, [api]);

  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };

  const playTrack = async (uri: string) => {
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", { uris: [uri] }, params);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await api.get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", {
        limit: "50",
        offset: String(tracks.length),
      });
      setTracks((prev) => [...prev, ...data.items.map((i) => i.track)]);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  };

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
        <div className="glow flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 text-5xl">
          💜
        </div>
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Liked Songs</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{total ?? tracks.length} tracks</p>
        </div>
      </div>
      <div className="flex flex-col">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            isPlaying={currentTrack?.id === track.id}
            onPlay={() => playTrack(track.uri)}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {total !== null && tracks.length < total && (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-[var(--color-text-muted)]">{tracks.length} of {total} tracks loaded</p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full bg-white/30 px-6 py-2 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load 50 more"}
          </button>
        </div>
      )}
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
