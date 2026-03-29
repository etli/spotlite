import { useState, useCallback } from "react";
import type { SpotifyTrack } from "../types/spotify";

export interface ContextMenuState {
  track: SpotifyTrack;
  x: number;
  y: number;
}

export function useTrackContextMenu(options?: { playlistId?: string }) {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((track: SpotifyTrack, e: React.MouseEvent) => {
    e.preventDefault();
    setMenuState({ track, x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  return {
    menuState,
    handleContextMenu,
    closeMenu,
    playlistId: options?.playlistId,
  };
}
