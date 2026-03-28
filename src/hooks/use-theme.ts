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
  const accent = { h: (h + 30) % 360, s, l };
  root.style.setProperty("--theme-primary", hslToString(h, s, l));
  root.style.setProperty("--theme-accent", hslToString(accent.h, accent.s, accent.l));
  root.style.setProperty("--theme-glow", hslToStringWithAlpha(h, s, l, 0.3));
  root.style.setProperty("--theme-bg-tint", hslToStringWithAlpha(h, s, l, 0.08));
}
