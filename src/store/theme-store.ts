import { create } from "zustand";
import { hslToString, hslToStringWithAlpha } from "../lib/color";

interface ThemeState {
  primary: string;
  accent: string;
  glow: string;
  bgTint: string;
  currentAlbumId: string | null;
  setThemeFromColor: (h: number, s: number, l: number, albumId: string) => void;
}

const DEFAULT_HUE = 260;
const DEFAULT_SAT = 40;
const DEFAULT_LIGHT = 80;

export const useThemeStore = create<ThemeState>((set, get) => ({
  primary: hslToString(DEFAULT_HUE, DEFAULT_SAT, DEFAULT_LIGHT),
  accent: hslToString(DEFAULT_HUE + 30, DEFAULT_SAT, DEFAULT_LIGHT),
  glow: hslToStringWithAlpha(DEFAULT_HUE, DEFAULT_SAT, DEFAULT_LIGHT, 0.3),
  bgTint: hslToStringWithAlpha(DEFAULT_HUE, DEFAULT_SAT, DEFAULT_LIGHT, 0.08),
  currentAlbumId: null,
  setThemeFromColor: (h, s, l, albumId) => {
    if (get().currentAlbumId === albumId) return;
    set({
      primary: hslToString(h, s, l),
      accent: hslToString((h + 30) % 360, s, l),
      glow: hslToStringWithAlpha(h, s, l, 0.3),
      bgTint: hslToStringWithAlpha(h, s, l, 0.08),
      currentAlbumId: albumId,
    });
  },
}));
