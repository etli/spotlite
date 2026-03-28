import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import type { SpotifyPlaylist } from "../types/spotify";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  useEffect(() => {
    const api = createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    );
    api
      .get<{ items: SpotifyPlaylist[] }>("/v1/me/playlists", { limit: "50" })
      .then((data) => setPlaylists(data.items))
      .catch(() => {});
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
      isActive
        ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)] font-medium"
        : "text-[var(--color-text-secondary)] hover:bg-white/30"
    }`;

  return (
    <aside
      className={`glass-panel flex h-full flex-col gap-1 overflow-hidden transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-lg font-light tracking-widest text-[var(--color-text-primary)]">
          {collapsed ? "✦" : "✦ spotlite"}
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        <NavLink to="/" className={navLinkClass}>
          <span>📚</span>
          {!collapsed && <span>Library</span>}
        </NavLink>
        <NavLink to="/search" className={navLinkClass}>
          <span>🔍</span>
          {!collapsed && <span>Search</span>}
        </NavLink>
      </nav>
      {!collapsed && (
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Playlists
          </p>
          <div className="flex flex-col gap-0.5">
            {playlists.map((pl) => (
              <NavLink key={pl.id} to={`/playlist/${pl.id}`} className={navLinkClass}>
                <span className="truncate">{pl.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
