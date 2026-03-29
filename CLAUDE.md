# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Type check + production bundle → dist/
npm run lint         # ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Watch mode
```

Run a single test file: `npx vitest run src/lib/__tests__/color.test.ts`

## Setup

Requires a Spotify Developer Application. Copy `.env.example` to `.env` and set `VITE_SPOTIFY_CLIENT_ID`. The redirect URI must match what's registered in the Spotify dashboard (default: `http://127.0.0.1:5173/callback`).

## Architecture

Spotlite is a minimal Spotify web client. No backend — all auth uses OAuth2 PKCE flow directly in the browser.

**Entry points:** `index.html` loads the Spotify Web Playback SDK from CDN and sets up `window.__onSpotifyReady`, then mounts React via `src/main.tsx` → `src/App.tsx`.

**State (Zustand, `src/store/`):**
- `auth-store.ts` — access/refresh tokens, expiry, user country
- `player-store.ts` — current track, playback state, volume, shuffle/repeat, active device
- `theme-store.ts` — dynamic color palette extracted from album art

**Hooks (`src/hooks/`):** Orchestrate side effects and SDK integration. `use-playback.ts` integrates the Spotify Web Playback SDK; `use-remote-polling.ts` polls the REST API for non-local (Spotify Connect) device state; `use-spotify-auth.ts` manages the PKCE OAuth flow and token refresh.

**API (`src/lib/spotify-api.ts`):** Thin wrapper around Spotify REST API v1. Auto-refreshes tokens before expiry; auto-logouts on 401.

**Theming:** `fast-average-color` extracts dominant color from album art → HSL manipulation in `src/lib/color.ts` → CSS variables in `src/styles/theme.css`. Theme transitions are 300–500ms.

**Routing (React Router 7):** `/` library, `/search`, `/playlist/:id`, `/album/:id`, `/artist/:id`. `LoginView` renders instead of the main layout when unauthenticated.

**Styling:** Tailwind CSS 4 + custom CSS variables for the glass-morphism / Y2K cyber-pastel light aesthetic. Theme variables are defined in `src/styles/theme.css`.
