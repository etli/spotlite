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

## Spotify Web API Rules

- **OpenAPI spec:** Refer to the [Spotify OpenAPI specification](https://developer.spotify.com/reference/web-api/open-api-schema.yaml) for all endpoint paths, parameters, and response schemas. Do not guess endpoints or field names.
- **Authorization:** Use Authorization Code with PKCE (already implemented in `src/lib/spotify-auth.ts` and `src/hooks/use-spotify-auth.ts`). Never use the deprecated Implicit Grant flow. Never use Client Credentials for user data.
- **Redirect URIs:** Always use `http://127.0.0.1` for local dev (not `http://localhost`). Use HTTPS in production. No wildcard URIs.
- **Scopes:** Request only the minimum scopes needed. Current scopes are in `src/lib/spotify-auth.ts`. Do not add scopes preemptively.
- **Token management:** Tokens are stored in Zustand (in-memory only — not persisted to localStorage). Token refresh is automatic. Never expose the Client Secret in client-side code (PKCE uses `client_id` only).
- **Rate limits:** Handle HTTP 429 by reading the `Retry-After` header and waiting that many seconds before retrying. Use exponential backoff with jitter. Do not retry immediately or in tight loops. **This is not yet implemented — `src/lib/spotify-api.ts` currently throws on 429 like any other error.**
- **Deprecated endpoints:** Do not use `/playlists/{id}/tracks` (use `/playlists/{id}/items`). Do not use type-specific library endpoints (use `/me/library`).
- **Error handling:** Handle all HTTP error codes. Surface meaningful error messages to the user rather than swallowing errors silently.
- **Developer Terms:** Do not cache Spotify content beyond immediate use. Always attribute content to Spotify. Do not use the API to train ML models on Spotify data.
