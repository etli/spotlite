import { useEffect, useRef } from "react";
import { FastAverageColor } from "fast-average-color";
import { usePlayerStore } from "../store/player-store";
import { useThemeStore } from "../store/theme-store";
import { pastelizeColor, hslToString, hslToStringWithAlpha } from "../lib/color";

const fac = new FastAverageColor();
const paletteCache = new Map<string, { h: number; s: number; l: number }>();

export function useTheme() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setThemeFromColor = useThemeStore((s) => s.setThemeFromColor);
  const currentAlbumId = useThemeStore((s) => s.currentAlbumId);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const albumId = currentTrack?.album?.id;
    if (!albumId || albumId === currentAlbumId) return;

    const cached = paletteCache.get(albumId);
    if (cached) {
      setThemeFromColor(cached.h, cached.s, cached.l, albumId);
      applyCssVars(cached.h, cached.s, cached.l);
      return;
    }

    const imageUrl = currentTrack?.album?.images?.[0]?.url;
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    imgRef.current = img;

    img.onload = () => {
      if (imgRef.current !== img) return;
      try {
        const result = fac.getColor(img);
        const pastel = pastelizeColor(result.value[0], result.value[1], result.value[2]);
        paletteCache.set(albumId, pastel);
        setThemeFromColor(pastel.h, pastel.s, pastel.l, albumId);
        applyCssVars(pastel.h, pastel.s, pastel.l);
      } catch { /* keep current theme */ }
    };
  }, [currentTrack?.album?.id, currentAlbumId, currentTrack?.album?.images, setThemeFromColor]);
}

function applyCssVars(h: number, s: number, l: number) {
  const root = document.documentElement;
  const accentH = (h + 30) % 360;
  // Structural background and surfaces — entire app repaints
  root.style.setProperty("--color-bg", hslToString(h, s, l));
  root.style.setProperty("--color-surface", hslToString(h, Math.max(s - 15, 15), Math.min(l + 6, 96)));
  root.style.setProperty("--color-surface-hover", hslToString(h, Math.max(s - 10, 20), Math.min(l + 3, 94)));
  root.style.setProperty("--color-border", hslToString(h, Math.min(s + 10, 65), Math.max(l - 20, 55)));
  // Accent fills
  root.style.setProperty("--theme-primary", hslToString(h, Math.min(s + 5, 60), Math.max(l - 14, 60)));
  root.style.setProperty("--theme-accent", hslToString(accentH, Math.min(s + 5, 60), Math.max(l - 14, 60)));
  root.style.setProperty("--theme-glow", hslToStringWithAlpha(h, Math.min(s + 5, 60), Math.max(l - 14, 60), 0.3));
  // Flat drop-shadow color
  root.style.setProperty("--theme-shadow", hslToString(h, Math.min(s + 5, 55), Math.max(l - 26, 50)));
  // Hue-matched secondary text
  root.style.setProperty("--color-text-secondary", hslToString(h, 25, 45));
}
