# Retro Pixel Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glassmorphism Y2K aesthetic with a Soft Pixel Hybrid style — Press Start 2P font throughout, square corners, flat drop-shadows in the album color, Lucide icons, and album art color that repaints the entire app.

**Architecture:** Theme-first approach: update the color extraction and CSS variable system so the full app shifts with album art, then update each component to adopt pixel styling and Lucide icons. The `.glass-panel` class is reused but redefined — no component renames needed.

**Tech Stack:** React + TypeScript, Tailwind CSS 4, Zustand, `lucide-react` (new), `fast-average-color` (existing), Google Fonts (Press Start 2P)

---

## File Map

| File | Change |
|---|---|
| `package.json` | Add `lucide-react` dependency |
| `index.html` | Add Google Fonts link for Press Start 2P |
| `src/styles/theme.css` | Full rewrite — pixel panel style, 0 border-radius, Press Start 2P |
| `src/lib/color.ts` | Widen `pastelizeColor` clamps: S 30-50→35-55, L 75-85→78-88 |
| `src/lib/__tests__/color.test.ts` | Update clamp assertions to match new ranges |
| `src/hooks/use-theme.ts` | Expand `applyCssVars` to set 9 CSS variables |
| `src/components/PlayerBar.tsx` | Emoji → Lucide; remove `rounded-full`/`rounded-lg` |
| `src/components/NowPlaying.tsx` | Emoji → Lucide; remove `rounded-3xl` from album art |
| `src/components/MiniPlayer.tsx` | Emoji → Lucide; remove `rounded-3xl`/`rounded-full` |
| `src/components/VolumeControl.tsx` | Emoji → Lucide; update range input styling |
| `src/components/PanelShell.tsx` | Spacing/font-size adjustments for Press Start 2P |
| `src/components/SearchBar.tsx` | Inline SVG → `<Search />`; remove `rounded-2xl`/`backdrop-blur` |
| `src/components/TrackRow.tsx` | Remove `rounded-xl` |
| `src/components/AlbumCard.tsx` | Remove rounded classes; add pixel border/shadow on hover |
| `src/components/ProgressBar.tsx` | Remove `rounded-full` from track, fill, handle |
| `src/views/LoginView.tsx` | Remove glassmorphism; pixel panel style |
| `src/components/DevicePicker.tsx` | Emoji device icons → Lucide; remove `rounded-xl` |
| `src/components/ConfirmModal.tsx` | Remove `rounded-2xl`/`rounded-full`; pixel panel style |
| `src/components/CreatePlaylistModal.tsx` | Remove rounded classes; pixel panel style |

---

## Task 1: Install lucide-react

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install lucide-react
```

Expected output: `added N packages` with `lucide-react` listed.

- [ ] **Step 2: Verify it's available**

```bash
node -e "require('lucide-react')" 2>/dev/null && echo "ok" || echo "missing"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react"
```

---

## Task 2: Update color.ts — widen pastelizeColor clamps

**Files:**
- Modify: `src/lib/color.ts`
- Modify: `src/lib/__tests__/color.test.ts`

- [ ] **Step 1: Update the failing tests first**

Replace the two `pastelizeColor` test cases in `src/lib/__tests__/color.test.ts`:

```typescript
describe("pastelizeColor", () => {
  it("clamps dark aggressive colors to pastel range", () => {
    const result = pastelizeColor(139, 0, 0);
    expect(result.s).toBeGreaterThanOrEqual(35);
    expect(result.s).toBeLessThanOrEqual(55);
    expect(result.l).toBeGreaterThanOrEqual(78);
    expect(result.l).toBeLessThanOrEqual(88);
  });
  it("clamps already-light colors", () => {
    const result = pastelizeColor(255, 200, 200);
    expect(result.s).toBeGreaterThanOrEqual(35);
    expect(result.s).toBeLessThanOrEqual(55);
    expect(result.l).toBeGreaterThanOrEqual(78);
    expect(result.l).toBeLessThanOrEqual(88);
  });
  it("preserves hue", () => {
    const [originalH] = rgbToHsl(0, 100, 200);
    const result = pastelizeColor(0, 100, 200);
    expect(result.h).toBeCloseTo(originalH);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/lib/__tests__/color.test.ts
```

Expected: 2 failures — `Expected: >= 35` / `Expected: >= 78` style messages.

- [ ] **Step 3: Update pastelizeColor in src/lib/color.ts**

Change the one line in `pastelizeColor`:

```typescript
export function pastelizeColor(r: number, g: number, b: number): HslColor {
  const [h, _s, _l] = rgbToHsl(r, g, b);
  return { h, s: clamp(_s, 35, 55), l: clamp(_l, 78, 88) };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/__tests__/color.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/__tests__/color.test.ts
git commit -m "feat: widen pastelizeColor clamps for more vivid album theming"
```

---

## Task 3: Expand applyCssVars to set 9 CSS variables

**Files:**
- Modify: `src/hooks/use-theme.ts`

The new function derives all structural color variables from the album hue `h` and the pastelized `s`/`l`. No test changes needed — `applyCssVars` is a DOM side-effect function.

- [ ] **Step 1: Replace applyCssVars in src/hooks/use-theme.ts**

Full file:

```typescript
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
```

- [ ] **Step 2: Run existing tests to make sure nothing breaks**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-theme.ts
git commit -m "feat: expand applyCssVars to repaint entire app from album color"
```

---

## Task 4: Rewrite theme.css + add Google Fonts to index.html

**Files:**
- Modify: `index.html`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Add Google Fonts to index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Spotlite</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Bridge: SDK calls this immediately on load, before React mounts.
      // Store a promise that use-playback.ts resolves when ready.
      window.__onSpotifyReady = new Promise(function(resolve) {
        window.onSpotifyWebPlaybackSDKReady = resolve;
      });
    </script>
    <script src="https://sdk.scdn.co/spotify-player.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Rewrite src/styles/theme.css**

```css
:root {
  --theme-primary: hsl(260, 45%, 72%);
  --theme-accent: hsl(290, 45%, 72%);
  --theme-glow: hsla(260, 45%, 72%, 0.3);
  --theme-shadow: hsl(260, 40%, 58%);
  --color-bg: hsl(260, 42%, 84%);
  --color-surface: hsl(260, 25%, 92%);
  --color-surface-hover: hsl(260, 30%, 89%);
  --color-border: hsl(260, 50%, 65%);
  --color-text-primary: #2d2640;
  --color-text-secondary: hsl(260, 25%, 45%);
  --color-text-muted: #a99fba;
  --transition-theme: 500ms ease;
  --transition-ui: 150ms ease;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  transition: background-color var(--transition-theme);
  min-height: 100vh;
}

.glass-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 2px 2px 0 var(--theme-shadow);
  transition: background var(--transition-theme), border-color var(--transition-theme), box-shadow var(--transition-theme);
}

.glass-panel:hover {
  border-color: var(--theme-primary);
}

.glow {
  box-shadow: 2px 2px 0 var(--theme-shadow);
  transition: box-shadow var(--transition-theme);
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--theme-primary); }
::-webkit-scrollbar-thumb:hover { background: var(--color-border); }
```

- [ ] **Step 3: Run dev server and verify font loads**

```bash
npm run dev
```

Open http://localhost:5173. The app text should now render in the chunky Press Start 2P pixel font. The background should be a noticeable purple-ish pastel (default theme before any album loads).

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/theme.css
git commit -m "feat: rewrite theme.css for pixel aesthetic; load Press Start 2P font"
```

---

## Task 5: Update PlayerBar — Lucide icons + square corners

**Files:**
- Modify: `src/components/PlayerBar.tsx`

- [ ] **Step 1: Replace src/components/PlayerBar.tsx**

```tsx
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, MonitorSpeaker, ChevronDown } from "lucide-react";
import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";
import { VolumeControl } from "./VolumeControl";

interface PlayerBarProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
    setVolume: (vol: number) => void;
  };
  onToggleMode: () => void;
  onOpenDevices?: () => void;
  onOpenNowPlaying?: () => void;
}

export function PlayerBar({ playback, onToggleMode, onOpenDevices, onOpenNowPlaying }: PlayerBarProps) {
  const { currentTrack, isPlaying, progressMs, durationMs, shuffleState, repeatState, volume, activeDeviceName, isLocalPlayback } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="glass-panel m-2 flex flex-col gap-2 px-4 py-3">
      <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {albumArt && (
            <img src={albumArt} alt="" onClick={onOpenNowPlaying}
              className="glow h-12 w-12 shrink-0 cursor-pointer object-cover transition-transform hover:scale-105" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
            <p className="truncate text-[8px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className={`transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"} hover:opacity-80`}>
            <Shuffle size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
            <SkipBack size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={playback.togglePlay}
            className="flex h-10 w-10 items-center justify-center bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105">
            {isPlaying
              ? <Pause size={20} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
              : <Play size={20} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
          </button>
          <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
            <SkipForward size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={() => {}} className={`transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"} hover:opacity-80`}>
            {repeatState === "track"
              ? <Repeat1 size={16} strokeLinecap="square" strokeLinejoin="miter" />
              : <Repeat size={16} strokeLinecap="square" strokeLinejoin="miter" />}
          </button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          {!isLocalPlayback && activeDeviceName && (
            <span className="text-[7px] text-[var(--theme-accent)]">On: {activeDeviceName}</span>
          )}
          <VolumeControl volume={volume} onVolumeChange={playback.setVolume} />
          <button onClick={onOpenDevices} className="transition-opacity hover:opacity-70" title="Devices">
            <MonitorSpeaker size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button onClick={onToggleMode} className="transition-opacity hover:opacity-70" title="Mini player">
            <ChevronDown size={16} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerBar.tsx
git commit -m "feat: replace emoji with Lucide icons in PlayerBar; remove rounded corners"
```

---

## Task 6: Update NowPlaying — Lucide icons + square corners

**Files:**
- Modify: `src/components/NowPlaying.tsx`

- [ ] **Step 1: Replace src/components/NowPlaying.tsx**

```tsx
import { X, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1 } from "lucide-react";
import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";

interface NowPlayingProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
  };
  onClose: () => void;
}

export function NowPlaying({ playback, onClose }: NowPlayingProps) {
  const { currentTrack, isPlaying, progressMs, durationMs, shuffleState, repeatState } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)] p-8">
      <button onClick={onClose} className="absolute right-6 top-6 text-[var(--color-text-muted)] transition-opacity hover:opacity-70">
        <X size={20} strokeLinecap="square" strokeLinejoin="miter" />
      </button>
      {albumArt && (
        <img src={albumArt} alt="" className="glow mb-8 h-72 w-72 object-cover sm:h-80 sm:w-80 lg:h-96 lg:w-96" />
      )}
      <div className="mb-6 text-center">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="mt-2 text-[9px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
        <p className="mt-1 text-[8px] text-[var(--color-text-muted)]">{currentTrack?.album?.name}</p>
      </div>
      <div className="w-full max-w-md">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="mt-6 flex items-center gap-6">
        <button className={`transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"}`}>
          <Shuffle size={18} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
          <SkipBack size={22} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.togglePlay}
          className="flex h-16 w-16 items-center justify-center bg-[var(--theme-accent)] text-white shadow-lg transition-all hover:scale-105">
          {isPlaying
            ? <Pause size={28} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
            : <Play size={28} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
        <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
          <SkipForward size={22} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button className={`transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"}`}>
          {repeatState === "track"
            ? <Repeat1 size={18} strokeLinecap="square" strokeLinejoin="miter" />
            : <Repeat size={18} strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/NowPlaying.tsx
git commit -m "feat: replace emoji with Lucide icons in NowPlaying; remove rounded corners"
```

---

## Task 7: Update MiniPlayer — Lucide icons + square corners

**Files:**
- Modify: `src/components/MiniPlayer.tsx`

- [ ] **Step 1: Replace src/components/MiniPlayer.tsx**

```tsx
import { SkipBack, Play, Pause, SkipForward, ChevronUp } from "lucide-react";
import { usePlayerStore } from "../store/player-store";
import { ProgressBar } from "./ProgressBar";

interface MiniPlayerProps {
  playback: {
    togglePlay: () => void;
    nextTrack: () => void;
    previousTrack: () => void;
    seek: (ms: number) => void;
    setVolume: (vol: number) => void;
  };
  onToggleMode: () => void;
}

export function MiniPlayer({ playback, onToggleMode }: MiniPlayerProps) {
  const { currentTrack, isPlaying, progressMs, durationMs } = usePlayerStore();
  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
      {albumArt && <img src={albumArt} alt="" className="glow w-full max-w-xs object-cover" />}
      <div className="w-full max-w-xs text-center">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-primary)]">{currentTrack?.name ?? "Not playing"}</p>
        <p className="mt-2 truncate text-[8px] text-[var(--color-text-secondary)]">{currentTrack?.artists?.map((a) => a.name).join(", ")}</p>
      </div>
      <div className="w-full max-w-xs">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>
      <div className="flex items-center gap-5">
        <button onClick={playback.previousTrack} className="transition-opacity hover:opacity-70">
          <SkipBack size={20} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
        <button onClick={playback.togglePlay}
          className="flex h-14 w-14 items-center justify-center bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105">
          {isPlaying
            ? <Pause size={24} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />
            : <Play size={24} fill="white" stroke="white" strokeLinecap="square" strokeLinejoin="miter" />}
        </button>
        <button onClick={playback.nextTrack} className="transition-opacity hover:opacity-70">
          <SkipForward size={20} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
      </div>
      <button onClick={onToggleMode} className="flex items-center gap-1 text-[8px] text-[var(--color-text-muted)] transition-opacity hover:opacity-70">
        <ChevronUp size={12} strokeLinecap="square" strokeLinejoin="miter" />
        Full mode
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/MiniPlayer.tsx
git commit -m "feat: replace emoji with Lucide icons in MiniPlayer; remove rounded corners"
```

---

## Task 8: Update VolumeControl — Lucide icons + input styling

**Files:**
- Modify: `src/components/VolumeControl.tsx`

- [ ] **Step 1: Replace src/components/VolumeControl.tsx**

```tsx
import { VolumeX, Volume1, Volume2 } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onVolumeChange(volume === 0 ? 50 : 0)} className="transition-opacity hover:opacity-70">
        <Icon size={16} strokeLinecap="square" strokeLinejoin="miter" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer appearance-none bg-[var(--color-surface-hover)] accent-[var(--theme-primary)]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/VolumeControl.tsx
git commit -m "feat: replace emoji with Lucide icons in VolumeControl"
```

---

## Task 9: Update PanelShell and SearchBar

**Files:**
- Modify: `src/components/PanelShell.tsx`
- Modify: `src/components/SearchBar.tsx`

- [ ] **Step 1: Replace src/components/PanelShell.tsx**

```tsx
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "../views/SearchResults";

export function PanelShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleTitleClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          onClick={handleTitleClick}
          className="text-[11px] tracking-widest text-[var(--color-text-primary)] transition-opacity hover:opacity-70"
        >
          ✦ spotlite
        </button>
      </div>
      <div className="shrink-0 px-4 pb-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery ? <SearchResults query={searchQuery} onNavigate={() => setSearchQuery("")} /> : <Outlet />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace src/components/SearchBar.tsx**

```tsx
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        size={14}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-8 text-[8px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-all focus:border-[var(--theme-primary)] focus:outline-none focus:shadow-[2px_2px_0_var(--theme-shadow)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all pass (SearchBar tests check for the search input, not the icon).

- [ ] **Step 4: Commit**

```bash
git add src/components/PanelShell.tsx src/components/SearchBar.tsx
git commit -m "feat: Lucide Search icon in SearchBar; pixel styling in PanelShell"
```

---

## Task 10: Update TrackRow — remove rounded corners

**Files:**
- Modify: `src/components/TrackRow.tsx`

- [ ] **Step 1: Replace src/components/TrackRow.tsx**

```tsx
import type { SpotifyTrack } from "../types/spotify";

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onContextMenu?: (track: SpotifyTrack, e: React.MouseEvent) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, isPlaying, onPlay, onContextMenu }: TrackRowProps) {
  return (
    <button
      onClick={onPlay}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(track, e); } : undefined}
      className={`group flex w-full items-center gap-4 px-3 py-2.5 text-left transition-all hover:bg-[var(--color-surface-hover)] ${
        isPlaying ? "bg-[var(--theme-accent)]/10" : ""
      }`}>
      <span className="w-6 text-center text-[8px] text-[var(--color-text-muted)] group-hover:hidden">{index + 1}</span>
      <span className="hidden w-6 text-center text-[8px] group-hover:block">▶</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[9px] ${isPlaying ? "font-medium text-[var(--theme-accent)]" : "text-[var(--color-text-primary)]"}`}>{track.name}</p>
        <p className="mt-0.5 truncate text-[8px] text-[var(--color-text-secondary)]">{track.artists.map((a) => a.name).join(", ")}</p>
      </div>
      <span className="text-[8px] text-[var(--color-text-muted)]">{formatDuration(track.duration_ms)}</span>
    </button>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/components/__tests__/TrackRow.test.tsx
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrackRow.tsx
git commit -m "feat: pixel styling for TrackRow; remove rounded corners"
```

---

## Task 11: Update AlbumCard — pixel border + square corners

**Files:**
- Modify: `src/components/AlbumCard.tsx`

- [ ] **Step 1: Replace src/components/AlbumCard.tsx**

```tsx
import { Link } from "react-router-dom";

interface AlbumCardProps {
  id: string;
  name: string;
  imageUrl: string | undefined;
  subtitle: string;
  linkTo: string;
  onClick?: () => void;
}

export function AlbumCard({ name, imageUrl, subtitle, linkTo, onClick }: AlbumCardProps) {
  return (
    <Link
      to={linkTo}
      onClick={onClick}
      className="group flex flex-col gap-2 border border-transparent p-3 transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[2px_2px_0_var(--theme-shadow)]"
    >
      <div className="aspect-square overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-3xl text-[var(--color-text-muted)]">♪</div>
        )}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-[9px] font-medium text-[var(--color-text-primary)]">{name}</p>
        <p className="mt-0.5 truncate text-[7px] text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/AlbumCard.tsx
git commit -m "feat: pixel border/shadow on AlbumCard; remove rounded corners"
```

---

## Task 12: Update ProgressBar — remove rounded fills

**Files:**
- Modify: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Replace src/components/ProgressBar.tsx**

```tsx
import { useCallback, useRef, useState, useEffect } from "react";
import { usePlayerStore } from "../store/player-store";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ProgressBar({ progressMs, durationMs, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [displayMs, setDisplayMs] = useState(progressMs);

  useEffect(() => {
    setDisplayMs(progressMs);
  }, [progressMs]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDisplayMs((prev) => {
        const next = prev + 250;
        return next > durationMs ? durationMs : next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const percent = durationMs > 0 ? (displayMs / durationMs) * 100 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || durationMs === 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(Math.floor(ratio * durationMs));
    },
    [durationMs, onSeek],
  );

  return (
    <div className="flex items-center gap-2 text-[7px] text-[var(--color-text-muted)]">
      <span className="w-10 text-right">{formatTime(displayMs)}</span>
      <div
        ref={barRef}
        className="group relative h-1.5 flex-1 cursor-pointer border border-[var(--color-border)] bg-[var(--color-surface-hover)]"
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 h-full bg-[var(--theme-primary)]"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 bg-[var(--color-text-primary)] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${percent}%`, marginLeft: "-6px" }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProgressBar.tsx
git commit -m "feat: pixel progress bar; remove rounded fills"
```

---

## Task 13: Update LoginView — pixel panel style

**Files:**
- Modify: `src/views/LoginView.tsx`

- [ ] **Step 1: Replace src/views/LoginView.tsx**

```tsx
interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-12 shadow-[2px_2px_0_var(--theme-shadow)]">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[18px] text-[var(--color-text-primary)]">✦ spotlite</h1>
          <p className="text-[8px] text-[var(--color-text-secondary)]">your music, simplified</p>
        </div>
        <button
          onClick={onLogin}
          className="border border-[var(--color-border)] bg-[var(--theme-accent)] px-8 py-3 text-[9px] font-medium text-white shadow-[2px_2px_0_var(--theme-shadow)] transition-all hover:scale-105 hover:shadow-[3px_3px_0_var(--theme-shadow)]"
        >
          Connect with Spotify
        </button>
        <p className="max-w-xs text-center text-[7px] text-[var(--color-text-muted)]">
          Requires Spotify Premium. We only access your library and playback.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.tsx
git commit -m "feat: pixel panel style for LoginView"
```

---

## Task 14: Update DevicePicker — Lucide device icons + square corners

**Files:**
- Modify: `src/components/DevicePicker.tsx`

- [ ] **Step 1: Replace src/components/DevicePicker.tsx**

```tsx
import { Laptop, Smartphone, Speaker, Tv, Music, X } from "lucide-react";
import type { SpotifyDevice } from "../types/spotify";

interface DevicePickerProps {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (deviceId: string, deviceName: string) => void;
  onClose: () => void;
}

function DeviceIcon({ type }: { type: string }) {
  const props = { size: 16, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
  switch (type.toLowerCase()) {
    case "computer": return <Laptop {...props} />;
    case "smartphone": return <Smartphone {...props} />;
    case "speaker": return <Speaker {...props} />;
    case "tv": return <Tv {...props} />;
    default: return <Music {...props} />;
  }
}

export function DevicePicker({ devices, activeDeviceId, onSelectDevice, onClose }: DevicePickerProps) {
  return (
    <div className="glass-panel absolute bottom-full right-0 mb-2 w-64 p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[7px] uppercase tracking-wider text-[var(--color-text-muted)]">Connect to a device</p>
        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <X size={14} strokeLinecap="square" strokeLinejoin="miter" />
        </button>
      </div>
      {devices.length === 0 ? (
        <p className="px-2 py-4 text-center text-[7px] text-[var(--color-text-muted)]">No devices found. Open Spotify on a device to see it here.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => device.id && onSelectDevice(device.id, device.name)}
              className={`flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                device.id === activeDeviceId
                  ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <DeviceIcon type={device.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px]">{device.name}</p>
                <p className="text-[7px] text-[var(--color-text-muted)]">{device.type}</p>
              </div>
              {device.is_active && <span className="text-[7px] text-[var(--theme-accent)]">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/DevicePicker.tsx
git commit -m "feat: Lucide device icons in DevicePicker; remove rounded corners"
```

---

## Task 15: Update ConfirmModal and CreatePlaylistModal — pixel panel style

**Files:**
- Modify: `src/components/ConfirmModal.tsx`
- Modify: `src/components/CreatePlaylistModal.tsx`

- [ ] **Step 1: Replace src/components/ConfirmModal.tsx**

```tsx
import { useEffect } from "react";
import ReactDOM from "react-dom";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-80 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[2px_2px_0_var(--theme-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-[10px] text-[var(--color-text-primary)]">{title}</h2>
        <p className="mb-6 text-[8px] text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-[var(--color-border)] px-4 py-1.5 text-[8px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="border border-[var(--color-border)] bg-red-400 px-4 py-1.5 text-[8px] font-medium text-white shadow-[2px_2px_0_#b91c1c] transition-all hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Replace src/components/CreatePlaylistModal.tsx**

```tsx
import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import type { SpotifyPlaylist } from "../types/spotify";

interface CreatePlaylistModalProps {
  initialName?: string;
  submitLabel?: string;
  onCreated: (playlist: SpotifyPlaylist) => void;
  onCancel: () => void;
}

export function CreatePlaylistModal({
  initialName = "",
  submitLabel = "Create",
  onCreated,
  onCancel,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState(initialName);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = await api.post<SpotifyPlaylist>("/v1/me/playlists", { name: trimmed, public: false });
    onCreated(playlist);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <form
        className="w-80 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[2px_2px_0_var(--theme-shadow)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-[10px] text-[var(--color-text-primary)]">
          {submitLabel === "Save" ? "Rename playlist" : "New playlist"}
        </h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="mb-6 w-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-[8px] text-[var(--color-text-primary)] outline-none focus:border-[var(--theme-primary)] focus:shadow-[2px_2px_0_var(--theme-shadow)]"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[var(--color-border)] px-4 py-1.5 text-[8px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="border border-[var(--color-border)] bg-[var(--theme-accent)] px-4 py-1.5 text-[8px] font-medium text-white shadow-[2px_2px_0_var(--theme-shadow)] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfirmModal.tsx src/components/CreatePlaylistModal.tsx
git commit -m "feat: pixel panel style for ConfirmModal and CreatePlaylistModal"
```

---

## Final Verification

- [ ] **Run the full test suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Run the dev server and do a visual check**

```bash
npm run dev
```

Verify:
1. App loads with Press Start 2P font throughout
2. Default theme is a noticeable pastel purple (before any album loads)
3. Panels have flat borders + hard drop-shadows, no blur
4. Player controls show Lucide icons (not emoji)
5. Search bar shows the Lucide magnifying glass icon
6. Play a track — the entire background, panels, and borders shift to match album art color

- [ ] **Run the build to verify no TypeScript errors**

```bash
npm run build
```

Expected: no errors.
