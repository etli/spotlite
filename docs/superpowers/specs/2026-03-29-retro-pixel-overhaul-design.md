# Retro Pixel Visual Overhaul — Design Spec

**Date:** 2026-03-29
**Scope:** Visual styling only — layout and functionality unchanged.

## Summary

Replace the current Y2K glass-morphism aesthetic with a Soft Pixel Hybrid style: pastel flat drop-shadows, square corners, monospace pixel typography (Press Start 2P), and Lucide icons throughout. Album art color extraction is expanded to repaint the entire app — background, surfaces, borders, and accents all shift with the current track.

## Visual Style

**Direction:** Soft Pixel Hybrid — pastel-toned flat drop-shadows, solid borders in the theme color, square corners everywhere, pixel font. Less aggressive than chunky pixel/RetroUI, more pixel-forward than classic Y2K bevel.

**What goes away:**
- `backdrop-filter: blur` glassmorphism
- Rounded corners (`border-radius` → 0 throughout)
- Soft blurred box-shadows
- Emoji icons

**What comes in:**
- Hard 2px offset drop-shadows (`2px 2px 0 var(--theme-shadow)`)
- Solid 1px borders in `--color-border` (album-color-matched)
- Square corners
- Press Start 2P font
- Lucide React icons with `strokeLinecap="square"` and `strokeLinejoin="miter"`

## Typography

**Font:** Press Start 2P (Google Fonts), loaded in `index.html`. Applied on `body` — cascades everywhere.

**Sizing:** Base body font-size ~10px. UI text 8–11px. Track/album titles up to 12–13px. Press Start 2P is inherently chunky so sizes run smaller than Inter equivalents.

**Removed:** Wide `tracking-widest` classes — the font has built-in character spacing.

## Color System

### CSS Variable Expansion

`applyCssVars` in `use-theme.ts` currently sets 4 variables. It will set 9:

| Variable | Derivation | Role |
|---|---|---|
| `--color-bg` | H, S~42%, L~84% | Page background |
| `--color-surface` | H, S~25%, L~92% | Panel fill |
| `--color-surface-hover` | H, S~30%, L~89% | Panel hover |
| `--color-border` | H, S~50%, L~65% | All panel borders |
| `--theme-primary` | H, S~45%, L~72% | Accent fills (play btn, active track) |
| `--theme-accent` | H+30, S~45%, L~72% | Secondary accent |
| `--theme-glow` | H, S~45%, L~72%, A~0.3 | Legacy glow (kept for compatibility) |
| `--theme-shadow` | H, S~40%, L~58% | Hard flat drop-shadow color |
| `--color-text-secondary` | H, S~25%, L~45% | Hue-matched secondary text |

`--color-text-primary` and `--color-text-muted` remain fixed (dark) for readability.

### `pastelizeColor` clamp widening

`color.ts` current: `S: clamp(30, 50)`, `L: clamp(75, 85)`
Updated: `S: clamp(35, 55)`, `L: clamp(78, 88)`

This makes the background read as definitively colored rather than nearly-white.

## Icon System

Install `lucide-react`. All icons use `strokeLinecap="square"` and `strokeLinejoin="miter"`. Size `16` for most controls, `20` for the primary play/pause button.

| Location | Replaces | Lucide icon |
|---|---|---|
| PlayerBar — shuffle | 🔀 | `<Shuffle />` |
| PlayerBar — prev | ⏮ | `<SkipBack />` |
| PlayerBar — play | ▶ | `<Play />` |
| PlayerBar — pause | ⏸ | `<Pause />` |
| PlayerBar — next | ⏭ | `<SkipForward />` |
| PlayerBar — repeat (off/on) | 🔁 | `<Repeat />` |
| PlayerBar — repeat-one | 🔁 | `<Repeat1 />` |
| PlayerBar — devices | 📡 | `<MonitorSpeaker />` |
| PlayerBar — mini mode toggle | 🔽 | `<ChevronDown />` |
| NowPlaying — close | ✕ | `<X />` |
| NowPlaying — shuffle/prev/play/pause/next/repeat | same emoji as PlayerBar | same Lucide icons as PlayerBar |
| MiniPlayer — prev/play/pause/next | same emoji as PlayerBar | same Lucide icons as PlayerBar |
| MiniPlayer — full mode toggle | 🔼 | `<ChevronUp />` |
| VolumeControl — muted | 🔇 | `<VolumeX />` |
| VolumeControl — low | 🔉 | `<Volume1 />` |
| VolumeControl — high | 🔊 | `<Volume2 />` |
| SearchBar | custom `<svg>` | `<Search />` |

The `✦` in `✦ spotlite` logo stays — it's a Unicode text character, not emoji.
The `▶` play indicator in `TrackRow` stays — Unicode text character used inline.

## Implementation Approach

Theme-first, then components:

1. Color system (`color.ts`, `use-theme.ts`, `theme.css`)
2. Font loading (`index.html`)
3. Components (icon swaps + styling per component)

### Phase 1 — Color & theme system

**`color.ts`:** Widen `pastelizeColor` clamps as above.

**`use-theme.ts`:** Expand `applyCssVars` to set all 9 variables.

**`theme.css`:** Full rewrite:
- All `--radius-*` vars → 0
- `.glass-panel` → pixel panel: solid `--color-surface` fill, 1px `--color-border` border, `2px 2px 0 var(--theme-shadow)` box-shadow, no `backdrop-filter`
- `.glow` → hard flat shadow, no blur
- Remove `.sparkle` class
- Scrollbar thumb → `--theme-primary`
- Body font-family → `'Press Start 2P', monospace`
- Body font-size → 10px

### Phase 2 — Components

Each component: remove rounded corner classes, remove glass/blur references, update to pixel panel styling where applicable, swap icons.

**Files changed:**
- `src/components/PlayerBar.tsx` — all emoji → Lucide
- `src/components/NowPlaying.tsx` — all emoji → Lucide; album art loses `rounded-3xl`
- `src/components/MiniPlayer.tsx` — emoji → Lucide; album art loses `rounded-3xl`
- `src/components/VolumeControl.tsx` — emoji → Lucide; range input styled with theme vars
- `src/components/PanelShell.tsx` — remove glass-panel blur; pixel panel styling
- `src/components/SearchBar.tsx` — inline SVG → `<Search />`
- `src/components/TrackRow.tsx` — remove `rounded-xl`
- `src/components/AlbumCard.tsx` — rounded corners removed, pixel border/shadow
- `src/components/ProgressBar.tsx` — pixel border style
- `src/views/LoginView.tsx` — pixel panel styling
- `src/components/DevicePicker.tsx` — pixel panel styling
- `src/components/ConfirmModal.tsx` — pixel panel styling
- `src/components/CreatePlaylistModal.tsx` — pixel panel styling

## Non-Goals

- No layout changes
- No functionality changes
- No new routes or components
- No changes to Spotify API integration
