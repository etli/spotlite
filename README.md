# Spotlite

A minimal Spotify web client with a Y2K cyber-pastel light aesthetic. No backend — auth runs entirely in the browser via OAuth2 PKCE.

## Features

- Browse and play your library (playlists, albums, artists)
- Full playback controls — shuffle, repeat, volume, seek
- Dynamic theming: album art colors drive the UI palette in real time
- Spotify Connect support via remote device polling
- Library tabs sorted by most recently played

## Setup

1. Create a [Spotify Developer Application](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:5173/callback` as an allowed redirect URI.
3. Copy `.env.example` to `.env` and set your client ID:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

## Commands

```bash
npm run dev        # Dev server at http://127.0.0.1:5173
npm run build      # Type check + production bundle → dist/
npm run lint       # ESLint
npm run test       # Run tests (Vitest)
```

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Zustand** for state (auth, player, theme)
- **React Router 7** for client-side routing
- **Tailwind CSS 4** + CSS variables for glass-morphism theming
- **Spotify Web Playback SDK** + REST API v1
