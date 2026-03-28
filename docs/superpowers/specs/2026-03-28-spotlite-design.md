# Spotlite — Design Spec

A minimal, personal Spotify client with a Y2K cyber-pastel aesthetic. Music only — no podcasts, audiobooks, or recommendations. The UI dynamically shifts color theme based on the current track's album art.

## Platform & Architecture

- **Web app** (React SPA) that also packages as a **desktop app** (Tauri 2)
- **Client-side only** — no backend server. All Spotify API calls made directly from the browser/Tauri webview
- **Auth:** Spotify OAuth 2.0 with PKCE flow (no client secret needed)

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 + TypeScript | Component model suits dynamic theming and responsive layouts |
| Build | Vite | Fast dev server, clean build tooling |
| Desktop | Tauri 2 | ~10MB vs Electron's ~200MB, Rust backend available if needed |
| Styling | Tailwind CSS 4 | Utility classes + CSS custom properties for dynamic theming |
| Routing | React Router | Client-side SPA routing |
| State | Zustand | Lightweight, minimal boilerplate, right-sized for this app |
| Playback | @spotify/web-playback-sdk | In-app playback, registers as Spotify Connect device |
| Color extraction | fast-average-color | Extract palette from album art for dynamic theming |

## Authentication

### Flow (PKCE)
1. On launch, check localStorage for a valid access token
2. If missing or expired, redirect to Spotify `/authorize` with PKCE code challenge
3. Spotify redirects back with auth code; exchange for access + refresh tokens
4. Store tokens in localStorage (web) or Tauri secure storage (desktop)
5. Auto-refresh tokens before expiry using the refresh token

### Scopes Required
- `user-read-playback-state` — current track, device info
- `user-modify-playback-state` — play, pause, skip, seek, transfer playback
- `user-read-currently-playing` — now playing info
- `user-library-read` — saved albums, liked songs
- `playlist-read-private` — user's playlists
- `streaming` — Web Playback SDK (in-app playback)
- `user-read-private` — account info for display

### API Client
- Thin wrapper around `fetch` with automatic token refresh on 401
- All responses typed with TypeScript interfaces matching Spotify's API schema

## App Layout & Modes

### Full Mode
Three-zone layout:

1. **Left sidebar** (collapsible) — nav links (Library, Search) + scrollable list of user's playlists for quick access
2. **Main content area** — the active view (library grid, search results, album detail, artist page)
3. **Bottom player bar** — persistent across all views. Album art thumbnail, track info, playback controls, progress bar, volume, device picker, mini/full mode toggle

### Mini Mode
Player only — no sidebar or content area. Shows album art prominently, track info, playback controls, progress bar. Resizes fluidly with the window. Toggle between modes via a button in the player bar.

### Responsive Breakpoints (Full Mode)
- **Wide (>1024px)** — sidebar + content + player bar all visible
- **Medium (768–1024px)** — sidebar collapses to icons only, content area gets full width
- **Narrow (<768px)** — sidebar hidden (hamburger menu), content stacks vertically, player bar simplifies

## Routing

| Path | View |
|------|------|
| `/` | Library (home) |
| `/search` | Search |
| `/playlist/:id` | Playlist detail |
| `/album/:id` | Album detail |
| `/artist/:id` | Artist page |

## Core Views

### Library (Home)
- Tabbed sections: Playlists / Albums / Liked Songs
- Grid layout for playlists and albums (album art + title + subtitle)
- Liked Songs as a special playlist pinned at top
- Click any item to navigate to its detail view

### Search
- Single search bar at top
- Results filtered to three categories only: **Tracks, Albums, Artists** (no podcasts, audiobooks, or shows)
- Results appear in sections below the search bar as user types (debounced)
- Tracks playable directly from results; albums/artists navigate to detail views

### Album / Playlist Detail
- Large album art at top with title, artist/owner, year, track count
- Track list below — number, title, artist, duration
- Click a track to play; play button starts the whole album/playlist from that track
- The album art on this view drives the dynamic color theme

### Artist Page
- Artist image + name at top
- "Top Tracks" section (playable)
- "Discography" section — grid of albums, singles, compilations
- Click an album to navigate to album detail

### Now Playing (Expanded)
- Full-screen takeover within the app frame, large album art centered
- Track title, artist, album name
- Full playback controls, progress bar with seek
- This is essentially what Mini Mode shows, but within the full app chrome

## Playback & Spotify Connect

### In-App Playback (Web Playback SDK)
- Initialize SDK after auth, registering "Spotlite" as a Spotify Connect device
- Handles: play, pause, skip, previous, seek, shuffle, repeat
- Receives real-time playback state via SDK callbacks (no polling when playing locally)

### Spotify Connect (Casting to Devices)
- Device picker button in player bar — dropdown listing available devices (speakers, TVs, other Spotify clients)
- Fetch devices via `GET /v1/me/player/devices`
- Transfer playback via `PUT /v1/me/player` with target device ID
- When playing on a remote device, player bar shows "Listening on: [Device Name]" indicator
- Controls still work remotely — commands sent to active device
- Poll playback state every ~3 seconds when controlling a remote device (SDK callbacks only work for local playback)

### Player Bar State
Always reflects current playback regardless of active device. Shows: album art thumb, track name, artist, progress bar, play/pause, skip, previous, volume, shuffle, repeat, device picker, mini/full mode toggle.

## Dynamic Color Theming

### Color Extraction
- Use `fast-average-color` to extract the dominant color from the current track's album art
- Derive the accent color algorithmically: shift the dominant color's hue by ~30 degrees in HSL space
- Extract on track change only, not every poll cycle
- Cache palettes by album ID to avoid re-extraction on repeated listens

### CSS Custom Properties
Updated on `:root` when the palette changes:
- `--theme-primary` — dominant album color, pastelized
- `--theme-accent` — secondary album color, for progress bars, active states, hover highlights
- `--theme-glow` — translucent primary, for box-shadows and background glows
- `--theme-bg-tint` — faint primary wash over the light base background

### What Shifts
- Background gradient gets a subtle tint from the album palette
- Progress bar, active nav item, and interactive elements use accent color
- Glow effects behind album art and panels shift color
- Translucent panel borders pick up a faint tint

### What Stays Anchored
- Sidebar structure and background opacity
- Text colors (maintain readability contrast)
- Player bar chrome
- Overall layout and spacing

### Pastelization Algorithm
- Take extracted color, clamp saturation to 30–50% and lightness to 75–85% (HSL)
- Ensures even dark or aggressive album art produces a soft, usable theme
- Smooth CSS transition (~500ms ease) when colors change between tracks

## Visual Style: Cyber Pastel Y2K (Light Base)

- **Light base** with soft off-white/lavender background
- **Translucent panels** — frosted glass effect (`backdrop-filter: blur`) with faint colored borders
- **Pastel glow accents** — soft neon-like glows on interactive elements and album art
- **Subtle sparkle/star decorative elements** — small, infrequent, not distracting
- **Rounded shapes** — generous border-radius on cards, buttons, panels
- **Typography** — clean sans-serif, soft weight. Track titles slightly bolder, metadata lighter
- **Transitions** — smooth, gentle animations on hover, mode switches, and theme changes

## Project Structure

```
spotlite/
  src/
    components/       # PlayerBar, TrackRow, AlbumCard, DevicePicker, Sidebar, etc.
    views/            # Library, Search, AlbumDetail, PlaylistDetail, ArtistPage
    hooks/            # useSpotifyAuth, usePlayback, useTheme, useDevices
    lib/              # Spotify API client, color extraction, token management
    store/            # Zustand stores (auth, player, theme)
    styles/           # Tailwind config, base styles, Y2K theme tokens
    App.tsx           # Router + layout shell
    main.tsx          # Entry point
  src-tauri/          # Tauri config + minimal Rust backend
  index.html
  vite.config.ts
  tailwind.config.ts
```

## Content Filtering

Spotlite is music-only. The following Spotify content types are **excluded everywhere** in the app:
- Podcasts
- Audiobooks
- Shows / Episodes
- Algorithmic recommendations / Discover sections
- Social features (friend activity, collaborative playlists)

Search results filter by `type=track,album,artist` only. Library views only show music content.

## Requirements

- Spotify Premium account (required for Web Playback SDK and playback control)
- Spotify Developer App registration (for client ID, redirect URI)
