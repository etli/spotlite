# Spotlite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, personal Spotify client web app with Y2K cyber-pastel aesthetic that dynamically themes based on album art, with in-app playback and Spotify Connect casting.

**Architecture:** Client-side React SPA with no backend. Authenticates via Spotify PKCE OAuth, plays music via Web Playback SDK, controls remote devices via Spotify Connect API. Zustand for state, CSS custom properties for dynamic theming. Packages as desktop app via Tauri 2.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 4, Zustand, React Router, fast-average-color, @spotify/web-playback-sdk, Tauri 2

---

## File Map

```
spotlite/
  index.html                          # Vite entry HTML + Web Playback SDK script tag
  vite.config.ts                      # Vite config with React plugin
  tailwind.config.ts                  # Tailwind config with theme token extensions
  tsconfig.json                       # TypeScript config
  package.json                        # Dependencies and scripts
  .env.example                        # VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_REDIRECT_URI
  src/
    main.tsx                          # React root mount
    App.tsx                           # Router + LayoutShell + auth gate
    types/
      spotify.ts                      # TypeScript interfaces for Spotify API responses
    lib/
      spotify-auth.ts                 # PKCE helpers: generateCodeVerifier, generateCodeChallenge, buildAuthUrl, exchangeCode, refreshToken
      spotify-api.ts                  # Typed fetch wrapper with auto token refresh
      color.ts                        # extractDominantColor, pastelizeColor, deriveAccent
    store/
      auth-store.ts                   # Zustand store: tokens, isAuthenticated, login/logout actions
      player-store.ts                 # Zustand store: current track, playback state, device, SDK player ref
      theme-store.ts                  # Zustand store: primary, accent, glow, bgTint CSS values
    hooks/
      use-spotify-auth.ts             # Hook: manages auth flow, token refresh timer, redirect handling
      use-playback.ts                 # Hook: initializes Web Playback SDK, syncs state to store
      use-theme.ts                    # Hook: watches current track, extracts color, updates theme store + CSS vars
      use-devices.ts                  # Hook: polls available Spotify Connect devices
    components/
      LayoutShell.tsx                 # Full mode layout: sidebar + main + player bar
      Sidebar.tsx                     # Nav links + playlist list, collapsible
      PlayerBar.tsx                   # Persistent bottom bar: art, controls, progress, device picker, mode toggle
      MiniPlayer.tsx                  # Standalone mini mode player
      NowPlaying.tsx                  # Full-screen expanded player overlay
      DevicePicker.tsx                # Dropdown of Spotify Connect devices
      AlbumCard.tsx                   # Grid card: album art + title + subtitle
      TrackRow.tsx                    # Single track row: number, title, artist, duration, play button
      ProgressBar.tsx                 # Seekable progress bar with elapsed/remaining time
      VolumeControl.tsx               # Volume slider
      SearchBar.tsx                   # Debounced search input
    views/
      LoginView.tsx                   # Login screen with "Connect to Spotify" button
      LibraryView.tsx                 # Tabbed: Playlists / Albums / Liked Songs grids
      SearchView.tsx                  # Search bar + results sections (Tracks, Albums, Artists)
      PlaylistDetailView.tsx          # Playlist header + track list
      AlbumDetailView.tsx             # Album header + track list
      ArtistView.tsx                  # Artist image + top tracks + discography grid
    styles/
      theme.css                       # CSS custom properties defaults, Y2K base styles, transitions
  src-tauri/                          # Added in Task 19 (Tauri 2 setup)
    Cargo.toml
    tauri.conf.json
    src/main.rs
```

---

### Task 1: Scaffold Vite + React + TypeScript Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Initialize project with Vite**

Run:
```bash
cd /Users/lizzie/spotlite
npm create vite@latest . -- --template react-ts
```

Select: overwrite existing files if prompted (the directory has only git/docs).

- [ ] **Step 2: Install core dependencies**

Run:
```bash
npm install react-router-dom zustand fast-average-color
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with Tailwind**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: Set up Tailwind CSS entry**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
```

- [ ] **Step 6: Create .gitignore additions**

Append to `.gitignore`:

```
.env
.env.local
.superpowers/
```

- [ ] **Step 7: Verify the dev server starts**

Run:
```bash
npm run dev -- --open
```

Expected: Browser opens to Vite React starter page at `http://localhost:5173`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json tsconfig.app.json index.html src/ .gitignore .env.example
git commit -m "feat: scaffold Vite + React + TypeScript project with Tailwind"
```

---

### Task 2: Spotify TypeScript Types

**Files:**
- Create: `src/types/spotify.ts`

- [ ] **Step 1: Create Spotify API type definitions**

Create `src/types/spotify.ts`:

```ts
export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtistSimplified {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyArtist extends SpotifyArtistSimplified {
  images: SpotifyImage[];
  genres: string[];
  followers: { total: number };
}

export interface SpotifyAlbumSimplified {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtistSimplified[];
  release_date: string;
  total_tracks: number;
  uri: string;
  album_type: "album" | "single" | "compilation";
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  track_number: number;
  artists: SpotifyArtistSimplified[];
  album: SpotifyAlbumSimplified;
  is_playable?: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: { display_name: string | null };
  tracks: { total: number };
  uri: string;
}

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  device: SpotifyDevice;
  shuffle_state: boolean;
  repeat_state: "off" | "context" | "track";
}

export interface SpotifyPaginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

export interface SpotifySearchResult {
  tracks?: SpotifyPaginated<SpotifyTrack>;
  albums?: SpotifyPaginated<SpotifyAlbumSimplified>;
  artists?: SpotifyPaginated<SpotifyArtist>;
}

export interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null;
  added_at: string;
}

export interface SpotifyAlbumFull extends SpotifyAlbumSimplified {
  tracks: SpotifyPaginated<SpotifyTrack>;
  label: string;
  copyrights: { text: string; type: string }[];
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/spotify.ts
git commit -m "feat: add Spotify API TypeScript type definitions"
```

---

### Task 3: Spotify PKCE Auth Library

**Files:**
- Create: `src/lib/spotify-auth.ts`
- Test: `src/lib/__tests__/spotify-auth.test.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts` (update the config):

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
});
```

Add to `tsconfig.app.json` under `compilerOptions`:
```json
"types": ["vitest/globals"]
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write tests for PKCE helpers**

Create `src/lib/__tests__/spotify-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  SCOPES,
} from "../spotify-auth";

describe("generateCodeVerifier", () => {
  it("returns a string of length 128", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(128);
  });

  it("contains only URL-safe characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a base64url-encoded SHA-256 hash", async () => {
    const challenge = await generateCodeChallenge("test_verifier");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("returns consistent output for same input", async () => {
    const a = await generateCodeChallenge("same_input");
    const b = await generateCodeChallenge("same_input");
    expect(a).toBe(b);
  });
});

describe("buildAuthUrl", () => {
  it("builds a valid Spotify authorize URL", () => {
    const url = buildAuthUrl("test_challenge", "test_client_id", "http://localhost:5173/callback");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.spotify.com");
    expect(parsed.pathname).toBe("/authorize");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test_client_id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:5173/callback");
    expect(parsed.searchParams.get("code_challenge")).toBe("test_challenge");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("scope")).toBe(SCOPES.join(" "));
  });
});

describe("exchangeCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct POST body and returns tokens", async () => {
    const mockResponse = {
      access_token: "access_123",
      refresh_token: "refresh_456",
      expires_in: 3600,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await exchangeCode("auth_code", "verifier_123", "client_id", "http://localhost:5173/callback");

    expect(fetch).toHaveBeenCalledWith("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: expect.any(URLSearchParams),
    });
    const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth_code");
    expect(body.get("code_verifier")).toBe("verifier_123");
    expect(result).toEqual(mockResponse);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct refresh request", async () => {
    const mockResponse = {
      access_token: "new_access",
      refresh_token: "new_refresh",
      expires_in: 3600,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await refreshAccessToken("old_refresh", "client_id");

    const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old_refresh");
    expect(result).toEqual(mockResponse);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/spotify-auth.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement PKCE auth library**

Create `src/lib/spotify-auth.ts`:

```ts
export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  "playlist-read-private",
  "streaming",
  "user-read-private",
];

export function generateCodeVerifier(): string {
  const array = new Uint8Array(96);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCodePoint(b)).join("");
  return btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildAuthUrl(
  codeChallenge: string,
  clientId: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: SCOPES.join(" "),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/spotify-auth.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/spotify-auth.ts src/lib/__tests__/spotify-auth.test.ts vite.config.ts tsconfig.app.json package.json package-lock.json
git commit -m "feat: implement Spotify PKCE auth library with tests"
```

---

### Task 4: Spotify API Client

**Files:**
- Create: `src/lib/spotify-api.ts`
- Test: `src/lib/__tests__/spotify-api.test.ts`

- [ ] **Step 1: Write tests for API client**

Create `src/lib/__tests__/spotify-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpotifyApi } from "../spotify-api";

describe("createSpotifyApi", () => {
  let api: ReturnType<typeof createSpotifyApi>;
  let getToken: ReturnType<typeof vi.fn>;
  let onTokenExpired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    getToken = vi.fn().mockReturnValue("valid_token");
    onTokenExpired = vi.fn();
    api = createSpotifyApi(getToken, onTokenExpired);
  });

  it("sends GET requests with Authorization header", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    await api.get("/v1/me/playlists");

    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: "Bearer valid_token" },
    });
  });

  it("sends PUT requests with JSON body", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    await api.put("/v1/me/player", { device_ids: ["abc"] });

    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_ids: ["abc"] }),
    });
  });

  it("calls onTokenExpired on 401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(api.get("/v1/me")).rejects.toThrow();
    expect(onTokenExpired).toHaveBeenCalled();
  });

  it("appends query params to GET requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await api.get("/v1/search", { q: "test", type: "track" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/search?q=test&type=track",
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/spotify-api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement API client**

Create `src/lib/spotify-api.ts`:

```ts
const BASE_URL = "https://api.spotify.com";

export function createSpotifyApi(
  getToken: () => string | null,
  onTokenExpired: () => void,
) {
  async function request<T>(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<T> {
    const token = getToken();
    if (!token) {
      throw new Error("No access token available");
    }

    let url = `${BASE_URL}${path}`;
    if (params) {
      url += `?${new URLSearchParams(params).toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    const options: RequestInit = { headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.method = method;
      options.body = JSON.stringify(body);
    }

    if (method !== "GET" && body === undefined) {
      options.method = method;
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
      onTokenExpired();
      throw new Error("Token expired");
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  return {
    get<T>(path: string, params?: Record<string, string>): Promise<T> {
      return request<T>("GET", path, params);
    },
    put<T = void>(path: string, body?: unknown): Promise<T> {
      return request<T>("PUT", path, undefined, body);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>("POST", path, undefined, body);
    },
  };
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/spotify-api.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotify-api.ts src/lib/__tests__/spotify-api.test.ts
git commit -m "feat: implement typed Spotify API client with auto 401 handling"
```

---

### Task 5: Color Extraction & Pastelization Library

**Files:**
- Create: `src/lib/color.ts`
- Test: `src/lib/__tests__/color.test.ts`

- [ ] **Step 1: Write tests for color utilities**

Create `src/lib/__tests__/color.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pastelizeColor, deriveAccent, hslToString, rgbToHsl, hslToRgb } from "../color";

describe("rgbToHsl", () => {
  it("converts pure red", () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0);
    expect(s).toBeCloseTo(100);
    expect(l).toBeCloseTo(50);
  });

  it("converts white", () => {
    const [h, s, l] = rgbToHsl(255, 255, 255);
    expect(s).toBeCloseTo(0);
    expect(l).toBeCloseTo(100);
  });

  it("converts a mid-tone color", () => {
    const [h, s, l] = rgbToHsl(100, 150, 200);
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(220);
    expect(s).toBeGreaterThan(0);
    expect(l).toBeGreaterThan(0);
  });
});

describe("hslToRgb", () => {
  it("round-trips through rgbToHsl", () => {
    const [h, s, l] = rgbToHsl(100, 150, 200);
    const [r, g, b] = hslToRgb(h, s, l);
    expect(r).toBeCloseTo(100, 0);
    expect(g).toBeCloseTo(150, 0);
    expect(b).toBeCloseTo(200, 0);
  });
});

describe("pastelizeColor", () => {
  it("clamps dark aggressive colors to pastel range", () => {
    // Dark red: rgb(139, 0, 0) => hsl(0, 100, 27)
    const result = pastelizeColor(139, 0, 0);
    expect(result.s).toBeGreaterThanOrEqual(30);
    expect(result.s).toBeLessThanOrEqual(50);
    expect(result.l).toBeGreaterThanOrEqual(75);
    expect(result.l).toBeLessThanOrEqual(85);
  });

  it("clamps already-light colors", () => {
    // Light pink: rgb(255, 200, 200)
    const result = pastelizeColor(255, 200, 200);
    expect(result.s).toBeGreaterThanOrEqual(30);
    expect(result.s).toBeLessThanOrEqual(50);
    expect(result.l).toBeGreaterThanOrEqual(75);
    expect(result.l).toBeLessThanOrEqual(85);
  });

  it("preserves hue", () => {
    const [originalH] = rgbToHsl(0, 100, 200);
    const result = pastelizeColor(0, 100, 200);
    expect(result.h).toBeCloseTo(originalH);
  });
});

describe("deriveAccent", () => {
  it("shifts hue by ~30 degrees", () => {
    const accent = deriveAccent(180, 40, 80);
    expect(accent.h).toBeCloseTo(210);
  });

  it("wraps hue past 360", () => {
    const accent = deriveAccent(350, 40, 80);
    expect(accent.h).toBeCloseTo(20);
  });
});

describe("hslToString", () => {
  it("formats as hsl() string", () => {
    expect(hslToString(210, 40, 80)).toBe("hsl(210, 40%, 80%)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/color.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement color utilities**

Create `src/lib/color.ts`:

```ts
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l * 100];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function pastelizeColor(r: number, g: number, b: number): HslColor {
  const [h, _s, _l] = rgbToHsl(r, g, b);
  return {
    h,
    s: clamp(_s, 30, 50),
    l: clamp(_l, 75, 85),
  };
}

export function deriveAccent(h: number, s: number, l: number): HslColor {
  return {
    h: (h + 30) % 360,
    s,
    l,
  };
}

export function hslToString(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function hslToStringWithAlpha(h: number, s: number, l: number, a: number): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/color.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/__tests__/color.test.ts
git commit -m "feat: add color extraction, pastelization, and accent derivation utilities"
```

---

### Task 6: Zustand Auth Store

**Files:**
- Create: `src/store/auth-store.ts`
- Test: `src/store/__tests__/auth-store.test.ts`

- [ ] **Step 1: Write tests for auth store**

Create `src/store/__tests__/auth-store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../auth-store";

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });
    localStorage.clear();
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it("setTokens stores tokens and persists to localStorage", () => {
    useAuthStore.getState().setTokens("access_123", "refresh_456", 3600);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access_123");
    expect(state.refreshToken).toBe("refresh_456");
    expect(state.expiresAt).toBeGreaterThan(Date.now());
    expect(state.isAuthenticated()).toBe(true);
    expect(localStorage.getItem("spotlite_access_token")).toBe("access_123");
  });

  it("logout clears everything", () => {
    useAuthStore.getState().setTokens("access_123", "refresh_456", 3600);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
    expect(localStorage.getItem("spotlite_access_token")).toBeNull();
  });

  it("isAuthenticated returns false when token is expired", () => {
    useAuthStore.setState({
      accessToken: "expired",
      refreshToken: "refresh",
      expiresAt: Date.now() - 1000,
    });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/store/__tests__/auth-store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement auth store**

Create `src/store/auth-store.ts`:

```ts
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,

  setTokens: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    set({ accessToken, refreshToken, expiresAt });
    localStorage.setItem("spotlite_access_token", accessToken);
    localStorage.setItem("spotlite_refresh_token", refreshToken);
    localStorage.setItem("spotlite_expires_at", expiresAt.toString());
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null });
    localStorage.removeItem("spotlite_access_token");
    localStorage.removeItem("spotlite_refresh_token");
    localStorage.removeItem("spotlite_expires_at");
    localStorage.removeItem("spotlite_code_verifier");
  },

  isAuthenticated: () => {
    const { accessToken, expiresAt } = get();
    if (!accessToken || !expiresAt) return false;
    return Date.now() < expiresAt;
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem("spotlite_access_token");
    const refreshToken = localStorage.getItem("spotlite_refresh_token");
    const expiresAtStr = localStorage.getItem("spotlite_expires_at");
    if (accessToken && refreshToken && expiresAtStr) {
      set({
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAtStr, 10),
      });
    }
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/store/__tests__/auth-store.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/auth-store.ts src/store/__tests__/auth-store.test.ts
git commit -m "feat: implement auth store with localStorage persistence"
```

---

### Task 7: Player Store & Theme Store

**Files:**
- Create: `src/store/player-store.ts`, `src/store/theme-store.ts`
- Test: `src/store/__tests__/player-store.test.ts`, `src/store/__tests__/theme-store.test.ts`

- [ ] **Step 1: Write tests for player store**

Create `src/store/__tests__/player-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { usePlayerStore } from "../player-store";

describe("player-store", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      progressMs: 0,
      durationMs: 0,
      shuffleState: false,
      repeatState: "off",
      volume: 50,
      activeDeviceId: null,
      activeDeviceName: null,
      isLocalPlayback: true,
    });
  });

  it("starts with no track playing", () => {
    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it("setTrack updates current track and duration", () => {
    const track = {
      id: "1",
      name: "Test Song",
      uri: "spotify:track:1",
      duration_ms: 200000,
      track_number: 1,
      artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
      album: {
        id: "al1",
        name: "Album",
        images: [{ url: "https://img.jpg", height: 300, width: 300 }],
        artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
        release_date: "2024",
        total_tracks: 10,
        uri: "spotify:album:al1",
        album_type: "album" as const,
      },
    };
    usePlayerStore.getState().setTrack(track);
    const state = usePlayerStore.getState();
    expect(state.currentTrack?.name).toBe("Test Song");
    expect(state.durationMs).toBe(200000);
  });

  it("setPlaybackState updates playing and progress", () => {
    usePlayerStore.getState().setPlaybackState(true, 50000);
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.progressMs).toBe(50000);
  });

  it("setDevice updates active device info", () => {
    usePlayerStore.getState().setDevice("dev1", "Kitchen Speaker", false);
    const state = usePlayerStore.getState();
    expect(state.activeDeviceId).toBe("dev1");
    expect(state.activeDeviceName).toBe("Kitchen Speaker");
    expect(state.isLocalPlayback).toBe(false);
  });
});
```

- [ ] **Step 2: Write tests for theme store**

Create `src/store/__tests__/theme-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    useThemeStore.setState({
      primary: "hsl(260, 40%, 80%)",
      accent: "hsl(290, 40%, 80%)",
      glow: "hsla(260, 40%, 80%, 0.3)",
      bgTint: "hsla(260, 40%, 80%, 0.08)",
      currentAlbumId: null,
    });
  });

  it("starts with default lavender theme", () => {
    const state = useThemeStore.getState();
    expect(state.primary).toContain("hsl");
  });

  it("setThemeFromColor updates all properties", () => {
    useThemeStore.getState().setThemeFromColor(200, 40, 80, "album123");
    const state = useThemeStore.getState();
    expect(state.primary).toBe("hsl(200, 40%, 80%)");
    expect(state.accent).toBe("hsl(230, 40%, 80%)");
    expect(state.glow).toBe("hsla(200, 40%, 80%, 0.3)");
    expect(state.bgTint).toBe("hsla(200, 40%, 80%, 0.08)");
    expect(state.currentAlbumId).toBe("album123");
  });

  it("skips update if album ID matches", () => {
    useThemeStore.getState().setThemeFromColor(200, 40, 80, "album123");
    const firstPrimary = useThemeStore.getState().primary;
    useThemeStore.getState().setThemeFromColor(300, 50, 70, "album123");
    expect(useThemeStore.getState().primary).toBe(firstPrimary);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/store/__tests__/`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement player store**

Create `src/store/player-store.ts`:

```ts
import { create } from "zustand";
import type { SpotifyTrack } from "../types/spotify";

interface PlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  shuffleState: boolean;
  repeatState: "off" | "context" | "track";
  volume: number;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  isLocalPlayback: boolean;
  setTrack: (track: SpotifyTrack | null) => void;
  setPlaybackState: (isPlaying: boolean, progressMs: number) => void;
  setDevice: (id: string | null, name: string | null, isLocal: boolean) => void;
  setShuffle: (state: boolean) => void;
  setRepeat: (state: "off" | "context" | "track") => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  shuffleState: false,
  repeatState: "off",
  volume: 50,
  activeDeviceId: null,
  activeDeviceName: null,
  isLocalPlayback: true,

  setTrack: (track) =>
    set({
      currentTrack: track,
      durationMs: track?.duration_ms ?? 0,
    }),

  setPlaybackState: (isPlaying, progressMs) =>
    set({ isPlaying, progressMs }),

  setDevice: (id, name, isLocal) =>
    set({
      activeDeviceId: id,
      activeDeviceName: name,
      isLocalPlayback: isLocal,
    }),

  setShuffle: (shuffleState) => set({ shuffleState }),
  setRepeat: (repeatState) => set({ repeatState }),
  setVolume: (volume) => set({ volume }),
}));
```

- [ ] **Step 5: Implement theme store**

Create `src/store/theme-store.ts`:

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/store/__tests__/`
Expected: All 7 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/player-store.ts src/store/theme-store.ts src/store/__tests__/
git commit -m "feat: implement player and theme Zustand stores"
```

---

### Task 8: Auth Hook & Login View

**Files:**
- Create: `src/hooks/use-spotify-auth.ts`, `src/views/LoginView.tsx`

- [ ] **Step 1: Implement useSpotifyAuth hook**

Create `src/hooks/use-spotify-auth.ts`:

```ts
import { useEffect, useCallback } from "react";
import { useAuthStore } from "../store/auth-store";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
} from "../lib/spotify-auth";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

export function useSpotifyAuth() {
  const { accessToken, refreshToken, expiresAt, setTokens, logout, isAuthenticated, loadFromStorage } =
    useAuthStore();

  // Load tokens from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Handle callback redirect
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    const verifier = localStorage.getItem("spotlite_code_verifier");
    if (!verifier) return;

    // Clean URL
    window.history.replaceState({}, "", "/");

    exchangeCode(code, verifier, CLIENT_ID, REDIRECT_URI).then((tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      localStorage.removeItem("spotlite_code_verifier");
    });
  }, [setTokens]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!refreshToken || !expiresAt) return;

    const refreshIn = expiresAt - Date.now() - 60_000; // 1 min before expiry
    if (refreshIn <= 0) {
      // Token already expired or about to, refresh now
      refreshAccessToken(refreshToken, CLIENT_ID).then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      }).catch(() => logout());
      return;
    }

    const timer = setTimeout(() => {
      refreshAccessToken(refreshToken, CLIENT_ID).then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      }).catch(() => logout());
    }, refreshIn);

    return () => clearTimeout(timer);
  }, [refreshToken, expiresAt, setTokens, logout]);

  const login = useCallback(async () => {
    const verifier = generateCodeVerifier();
    localStorage.setItem("spotlite_code_verifier", verifier);
    const challenge = await generateCodeChallenge(verifier);
    const url = buildAuthUrl(challenge, CLIENT_ID, REDIRECT_URI);
    window.location.href = url;
  }, []);

  return {
    isAuthenticated: isAuthenticated(),
    accessToken,
    login,
    logout,
  };
}
```

- [ ] **Step 2: Implement LoginView**

Create `src/views/LoginView.tsx`:

```tsx
interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-8 rounded-3xl border border-white/30 bg-white/40 p-12 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-light tracking-wider text-gray-700">
            spotlite
          </h1>
          <p className="text-sm text-gray-500">your music, simplified</p>
        </div>
        <button
          onClick={onLogin}
          className="rounded-full bg-[var(--theme-accent)] px-8 py-3 text-sm font-medium text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
        >
          Connect with Spotify
        </button>
        <p className="max-w-xs text-center text-xs text-gray-400">
          Requires Spotify Premium. We only access your library and playback.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing template ones to clean up).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-spotify-auth.ts src/views/LoginView.tsx
git commit -m "feat: implement Spotify auth hook with PKCE flow and login view"
```

---

### Task 9: Y2K Base Theme & CSS Custom Properties

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/index.css`

- [ ] **Step 1: Create Y2K base theme**

Create `src/styles/theme.css`:

```css
:root {
  /* Dynamic theme colors — updated by JS when track changes */
  --theme-primary: hsl(260, 40%, 80%);
  --theme-accent: hsl(290, 40%, 80%);
  --theme-glow: hsla(260, 40%, 80%, 0.3);
  --theme-bg-tint: hsla(260, 40%, 80%, 0.08);

  /* Static base colors */
  --color-bg: #f5f0ff;
  --color-surface: rgba(255, 255, 255, 0.5);
  --color-surface-hover: rgba(255, 255, 255, 0.7);
  --color-border: rgba(255, 255, 255, 0.4);
  --color-text-primary: #2d2640;
  --color-text-secondary: #7a6f8a;
  --color-text-muted: #a99fba;

  /* Spacing & shape */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-theme: 500ms ease;
  --transition-ui: 150ms ease;
}

/* Global transitions for theme color changes */
body {
  background: linear-gradient(
    135deg,
    var(--color-bg) 0%,
    color-mix(in srgb, var(--theme-bg-tint), var(--color-bg)) 100%
  );
  color: var(--color-text-primary);
  font-family: "Inter", "SF Pro Display", -apple-system, system-ui, sans-serif;
  transition: background var(--transition-theme);
  min-height: 100vh;
}

/* Glass panel base class */
.glass-panel {
  background: var(--color-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition-theme),
              box-shadow var(--transition-theme);
}

.glass-panel:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 30%, var(--color-border));
}

/* Glow effect for album art and featured elements */
.glow {
  box-shadow: 0 8px 32px var(--theme-glow),
              0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow var(--transition-theme);
}

/* Subtle sparkle decorative elements */
.sparkle::before {
  content: "✦";
  position: absolute;
  font-size: 10px;
  color: var(--theme-primary);
  opacity: 0.4;
  pointer-events: none;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-text-muted);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
```

- [ ] **Step 2: Update index.css to import theme**

Replace `src/index.css`:

```css
@import "tailwindcss";
@import "./styles/theme.css";
```

- [ ] **Step 3: Verify styles load in browser**

Run: `npm run dev`
Expected: Browser shows a soft lavender-tinted background. The Vite default page content should render with the Inter font and custom colors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css src/index.css
git commit -m "feat: add Y2K cyber-pastel base theme with CSS custom properties"
```

---

### Task 10: Theme Hook (Color Extraction → CSS Custom Properties)

**Files:**
- Create: `src/hooks/use-theme.ts`

- [ ] **Step 1: Implement useTheme hook**

Create `src/hooks/use-theme.ts`:

```ts
import { useEffect, useRef } from "react";
import { FastAverageColor } from "fast-average-color";
import { usePlayerStore } from "../store/player-store";
import { useThemeStore } from "../store/theme-store";
import { pastelizeColor, deriveAccent, hslToString, hslToStringWithAlpha } from "../lib/color";

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

    // Check cache first
    const cached = paletteCache.get(albumId);
    if (cached) {
      setThemeFromColor(cached.h, cached.s, cached.l, albumId);
      applyCssVars(cached.h, cached.s, cached.l);
      return;
    }

    // Extract from album art
    const imageUrl = currentTrack?.album?.images?.[0]?.url;
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    imgRef.current = img;

    img.onload = () => {
      if (imgRef.current !== img) return; // stale
      try {
        const result = fac.getColor(img);
        const pastel = pastelizeColor(result.value[0], result.value[1], result.value[2]);
        paletteCache.set(albumId, pastel);
        setThemeFromColor(pastel.h, pastel.s, pastel.l, albumId);
        applyCssVars(pastel.h, pastel.s, pastel.l);
      } catch {
        // Extraction failed, keep current theme
      }
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-theme.ts
git commit -m "feat: implement theme hook — extracts album art color and applies CSS vars"
```

---

### Task 11: Web Playback SDK Hook

**Files:**
- Modify: `index.html`
- Create: `src/hooks/use-playback.ts`, `src/types/spotify-sdk.d.ts`

- [ ] **Step 1: Add Spotify SDK script to index.html**

Add before the closing `</body>` tag in `index.html`:

```html
<script src="https://sdk.scdn.co/spotify-player.js"></script>
```

- [ ] **Step 2: Create SDK type declarations**

Create `src/types/spotify-sdk.d.ts`:

```ts
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready", cb: (data: { device_id: string }) => void): void;
  addListener(event: "not_ready", cb: (data: { device_id: string }) => void): void;
  addListener(event: "player_state_changed", cb: (state: WebPlaybackState | null) => void): void;
  addListener(event: "initialization_error", cb: (data: { message: string }) => void): void;
  addListener(event: "authentication_error", cb: (data: { message: string }) => void): void;
  addListener(event: "account_error", cb: (data: { message: string }) => void): void;
  removeListener(event: string): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getCurrentState(): Promise<WebPlaybackState | null>;
}

interface WebPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: { name: string; uri: string }[];
      album: {
        name: string;
        uri: string;
        images: { url: string; height: number; width: number }[];
      };
    };
  };
  shuffle: boolean;
  repeat_mode: 0 | 1 | 2;
}

export {};
```

- [ ] **Step 3: Implement usePlayback hook**

Create `src/hooks/use-playback.ts`:

```ts
import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifyTrack } from "../types/spotify";

const DEVICE_NAME = "Spotlite";

export function usePlayback() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const {
    setTrack,
    setPlaybackState,
    setDevice,
    setShuffle,
    setRepeat,
    isPlaying,
    currentTrack,
    volume,
  } = usePlayerStore();

  // Initialize SDK
  useEffect(() => {
    if (!accessToken) return;

    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: DEVICE_NAME,
        getOAuthToken: (cb) => {
          const token = useAuthStore.getState().accessToken;
          if (token) cb(token);
        },
        volume: usePlayerStore.getState().volume / 100,
      });

      player.addListener("ready", ({ device_id }) => {
        deviceIdRef.current = device_id;
        setDevice(device_id, DEVICE_NAME, true);
      });

      player.addListener("not_ready", () => {
        deviceIdRef.current = null;
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const track = state.track_window.current_track;
        const spotifyTrack: SpotifyTrack = {
          id: track.id,
          name: track.name,
          uri: track.uri,
          duration_ms: track.duration_ms,
          track_number: 1,
          artists: track.artists.map((a) => ({
            id: a.uri.split(":")[2],
            name: a.name,
            uri: a.uri,
          })),
          album: {
            id: track.album.uri.split(":")[2],
            name: track.album.name,
            images: track.album.images,
            artists: [],
            release_date: "",
            total_tracks: 0,
            uri: track.album.uri,
            album_type: "album",
          },
        };
        setTrack(spotifyTrack);
        setPlaybackState(!state.paused, state.position);
        setShuffle(state.shuffle);
        const repeatMap = { 0: "off", 1: "context", 2: "track" } as const;
        setRepeat(repeatMap[state.repeat_mode]);
      });

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [accessToken, setTrack, setPlaybackState, setDevice, setShuffle, setRepeat]);

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
  const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
  const seek = useCallback((ms: number) => playerRef.current?.seek(ms), []);
  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol / 100);
    usePlayerStore.getState().setVolume(vol);
  }, []);

  return {
    deviceId: deviceIdRef.current,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html src/types/spotify-sdk.d.ts src/hooks/use-playback.ts
git commit -m "feat: integrate Spotify Web Playback SDK with player state sync"
```

---

### Task 12: Devices Hook

**Files:**
- Create: `src/hooks/use-devices.ts`

- [ ] **Step 1: Implement useDevices hook**

Create `src/hooks/use-devices.ts`:

```ts
import { useState, useEffect, useCallback } from "react";
import type { SpotifyDevice } from "../types/spotify";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";

export function useDevices() {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const setDevice = usePlayerStore((s) => s.setDevice);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  const fetchDevices = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api.get<{ devices: SpotifyDevice[] }>("/v1/me/player/devices");
      setDevices(data.devices);
    } catch {
      // Silently fail — device list is non-critical
    }
  }, [accessToken]);

  const transferPlayback = useCallback(async (deviceId: string, deviceName: string) => {
    try {
      await api.put("/v1/me/player", { device_ids: [deviceId] });
      const isLocal = deviceName === "Spotlite";
      setDevice(deviceId, deviceName, isLocal);
    } catch {
      // Transfer failed
    }
  }, [api, setDevice]);

  // Refresh device list periodically
  useEffect(() => {
    if (!accessToken) return;
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [accessToken, fetchDevices]);

  return { devices, fetchDevices, transferPlayback };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-devices.ts
git commit -m "feat: implement Spotify Connect device discovery and transfer hook"
```

---

### Task 13: App Shell, Router & Layout

**Files:**
- Create: `src/components/LayoutShell.tsx`, `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Implement Sidebar**

Create `src/components/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import type { SpotifyPlaylist } from "../types/spotify";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  useEffect(() => {
    const api = createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    );
    api
      .get<{ items: SpotifyPlaylist[] }>("/v1/me/playlists", { limit: "50" })
      .then((data) => setPlaylists(data.items))
      .catch(() => {});
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
      isActive
        ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)] font-medium"
        : "text-[var(--color-text-secondary)] hover:bg-white/30"
    }`;

  return (
    <aside
      className={`glass-panel flex flex-col gap-1 overflow-hidden transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-lg font-light tracking-widest text-[var(--color-text-primary)]">
          {collapsed ? "✦" : "✦ spotlite"}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-2">
        <NavLink to="/" className={navLinkClass}>
          <span>📚</span>
          {!collapsed && <span>Library</span>}
        </NavLink>
        <NavLink to="/search" className={navLinkClass}>
          <span>🔍</span>
          {!collapsed && <span>Search</span>}
        </NavLink>
      </nav>

      {/* Playlist list */}
      {!collapsed && (
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Playlists
          </p>
          <div className="flex flex-col gap-0.5">
            {playlists.map((pl) => (
              <NavLink
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className={navLinkClass}
              >
                <span className="truncate">{pl.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Implement LayoutShell**

Create `src/components/LayoutShell.tsx`:

```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutShellProps {
  miniMode: boolean;
  onToggleMode: () => void;
}

export function LayoutShell({ miniMode, onToggleMode }: LayoutShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (miniMode) {
    return null; // Mini mode renders its own component
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 gap-2 overflow-hidden p-2 pb-0">
        {/* Sidebar — hidden below 768px */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Main content */}
        <main className="glass-panel flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Player bar placeholder — built in Task 14 */}
      <div className="h-24 shrink-0 p-2" id="player-bar-slot" />
    </div>
  );
}
```

- [ ] **Step 3: Wire up App.tsx with router**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useSpotifyAuth } from "./hooks/use-spotify-auth";
import { usePlayback } from "./hooks/use-playback";
import { useTheme } from "./hooks/use-theme";
import { LayoutShell } from "./components/LayoutShell";
import { LoginView } from "./views/LoginView";
import { LibraryView } from "./views/LibraryView";
import { SearchView } from "./views/SearchView";
import { PlaylistDetailView } from "./views/PlaylistDetailView";
import { AlbumDetailView } from "./views/AlbumDetailView";
import { ArtistView } from "./views/ArtistView";
import { MiniPlayer } from "./components/MiniPlayer";
import { PlayerBar } from "./components/PlayerBar";

export default function App() {
  const { isAuthenticated, login } = useSpotifyAuth();
  const playback = usePlayback();
  const [miniMode, setMiniMode] = useState(false);
  useTheme();

  if (!isAuthenticated) {
    return <LoginView onLogin={login} />;
  }

  if (miniMode) {
    return <MiniPlayer onToggleMode={() => setMiniMode(false)} playback={playback} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 gap-2 overflow-hidden p-2 pb-0">
          <LayoutShell miniMode={miniMode} onToggleMode={() => setMiniMode(!miniMode)} />
        </div>
        <PlayerBar playback={playback} onToggleMode={() => setMiniMode(true)} />
      </div>
      <Routes>
        <Route element={<LayoutShell miniMode={false} onToggleMode={() => setMiniMode(true)} />}>
          <Route path="/" element={<LibraryView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/playlist/:id" element={<PlaylistDetailView />} />
          <Route path="/album/:id" element={<AlbumDetailView />} />
          <Route path="/artist/:id" element={<ArtistView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Note: This references components and views that don't exist yet. They'll be created in subsequent tasks. For now, create stub files so TypeScript doesn't error.

- [ ] **Step 4: Create stub view/component files**

Create placeholder files that export empty components. These will be filled in subsequent tasks.

`src/views/LibraryView.tsx`:
```tsx
export function LibraryView() {
  return <div>Library</div>;
}
```

`src/views/SearchView.tsx`:
```tsx
export function SearchView() {
  return <div>Search</div>;
}
```

`src/views/PlaylistDetailView.tsx`:
```tsx
export function PlaylistDetailView() {
  return <div>Playlist</div>;
}
```

`src/views/AlbumDetailView.tsx`:
```tsx
export function AlbumDetailView() {
  return <div>Album</div>;
}
```

`src/views/ArtistView.tsx`:
```tsx
export function ArtistView() {
  return <div>Artist</div>;
}
```

`src/components/PlayerBar.tsx`:
```tsx
export function PlayerBar({ playback, onToggleMode }: { playback: any; onToggleMode: () => void }) {
  return <div className="glass-panel m-2 h-20 p-4">Player Bar (coming soon)</div>;
}
```

`src/components/MiniPlayer.tsx`:
```tsx
export function MiniPlayer({ onToggleMode, playback }: { onToggleMode: () => void; playback: any }) {
  return <div>Mini Player</div>;
}
```

- [ ] **Step 5: Update main.tsx**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Verify the app loads with the login screen**

Run: `npm run dev`
Expected: Login screen with "spotlite" heading, "Connect with Spotify" button, lavender-tinted background.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: wire up app shell with router, layout, sidebar, and stub views"
```

---

### Task 14: Player Bar & Progress Bar Components

**Files:**
- Create: `src/components/ProgressBar.tsx`, `src/components/VolumeControl.tsx`
- Modify: `src/components/PlayerBar.tsx`

- [ ] **Step 1: Implement ProgressBar**

Create `src/components/ProgressBar.tsx`:

```tsx
import { useCallback, useRef, useState } from "react";

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const percent = durationMs > 0
    ? ((isDragging ? dragProgress : progressMs) / durationMs) * 100
    : 0;

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
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <span className="w-10 text-right">{formatTime(isDragging ? dragProgress : progressMs)}</span>
      <div
        ref={barRef}
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/30"
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--theme-accent)] transition-all"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md transition-all opacity-0 hover:opacity-100"
          style={{ left: `${percent}%`, marginLeft: "-6px" }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Implement VolumeControl**

Create `src/components/VolumeControl.tsx`:

```tsx
interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const icon = volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVolumeChange(volume === 0 ? 50 : 0)}
        className="text-sm transition-opacity hover:opacity-70"
      >
        {icon}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-[var(--theme-accent)]"
      />
    </div>
  );
}
```

- [ ] **Step 3: Implement full PlayerBar**

Replace `src/components/PlayerBar.tsx`:

```tsx
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
  const {
    currentTrack,
    isPlaying,
    progressMs,
    durationMs,
    shuffleState,
    repeatState,
    volume,
    activeDeviceName,
    isLocalPlayback,
  } = usePlayerStore();

  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="glass-panel m-2 flex flex-col gap-2 px-4 py-3">
      {/* Progress bar */}
      <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />

      <div className="flex items-center gap-4">
        {/* Track info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {albumArt && (
            <img
              src={albumArt}
              alt=""
              onClick={onOpenNowPlaying}
              className="glow h-12 w-12 shrink-0 cursor-pointer rounded-lg object-cover transition-transform hover:scale-105"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {currentTrack?.name ?? "Not playing"}
            </p>
            <p className="truncate text-xs text-[var(--color-text-secondary)]">
              {currentTrack?.artists?.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* toggle shuffle via API */}}
            className={`text-sm transition-opacity ${shuffleState ? "opacity-100" : "opacity-40"} hover:opacity-80`}
          >
            🔀
          </button>
          <button onClick={playback.previousTrack} className="text-lg transition-opacity hover:opacity-70">
            ⏮
          </button>
          <button
            onClick={playback.togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-accent)] text-white shadow-md transition-all hover:scale-105"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={playback.nextTrack} className="text-lg transition-opacity hover:opacity-70">
            ⏭
          </button>
          <button
            onClick={() => {/* toggle repeat via API */}}
            className={`text-sm transition-opacity ${repeatState !== "off" ? "opacity-100" : "opacity-40"} hover:opacity-80`}
          >
            🔁
          </button>
        </div>

        {/* Right side: volume, devices, mini mode */}
        <div className="flex flex-1 items-center justify-end gap-4">
          {!isLocalPlayback && activeDeviceName && (
            <span className="text-xs text-[var(--theme-accent)]">
              Listening on: {activeDeviceName}
            </span>
          )}
          <VolumeControl volume={volume} onVolumeChange={playback.setVolume} />
          <button
            onClick={onOpenDevices}
            className="text-sm transition-opacity hover:opacity-70"
            title="Devices"
          >
            📡
          </button>
          <button
            onClick={onToggleMode}
            className="text-sm transition-opacity hover:opacity-70"
            title="Mini player"
          >
            🔽
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify player bar renders in browser**

Run: `npm run dev`
Expected: After login, the player bar shows at the bottom with controls and a "Not playing" state.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgressBar.tsx src/components/VolumeControl.tsx src/components/PlayerBar.tsx
git commit -m "feat: implement player bar with progress, volume, and playback controls"
```

---

### Task 15: Reusable AlbumCard & TrackRow Components

**Files:**
- Create: `src/components/AlbumCard.tsx`, `src/components/TrackRow.tsx`

- [ ] **Step 1: Implement AlbumCard**

Create `src/components/AlbumCard.tsx`:

```tsx
import { Link } from "react-router-dom";

interface AlbumCardProps {
  id: string;
  name: string;
  imageUrl: string | undefined;
  subtitle: string;
  linkTo: string;
}

export function AlbumCard({ id, name, imageUrl, subtitle, linkTo }: AlbumCardProps) {
  return (
    <Link
      to={linkTo}
      className="group flex flex-col gap-2 rounded-2xl p-3 transition-all hover:bg-white/30"
    >
      <div className="aspect-square overflow-hidden rounded-xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="glow h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/20 text-3xl text-[var(--color-text-muted)]">
            ♪
          </div>
        )}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{name}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Implement TrackRow**

Create `src/components/TrackRow.tsx`:

```tsx
import type { SpotifyTrack } from "../types/spotify";

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, isPlaying, onPlay }: TrackRowProps) {
  return (
    <button
      onClick={onPlay}
      className={`group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/30 ${
        isPlaying ? "bg-[var(--theme-accent)]/10" : ""
      }`}
    >
      <span className="w-6 text-center text-sm text-[var(--color-text-muted)] group-hover:hidden">
        {index + 1}
      </span>
      <span className="hidden w-6 text-center text-sm group-hover:block">▶</span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            isPlaying ? "font-medium text-[var(--theme-accent)]" : "text-[var(--color-text-primary)]"
          }`}
        >
          {track.name}
        </p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">
          {track.artists.map((a) => a.name).join(", ")}
        </p>
      </div>

      <span className="text-xs text-[var(--color-text-muted)]">
        {formatDuration(track.duration_ms)}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AlbumCard.tsx src/components/TrackRow.tsx
git commit -m "feat: add reusable AlbumCard and TrackRow components"
```

---

### Task 16: Library View

**Files:**
- Modify: `src/views/LibraryView.tsx`

- [ ] **Step 1: Implement Library view with tabs**

Replace `src/views/LibraryView.tsx`:

```tsx
import { useState, useEffect } from "react";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import type {
  SpotifyPlaylist,
  SpotifyAlbumSimplified,
  SpotifyTrack,
  SpotifyPaginated,
} from "../types/spotify";
import { TrackRow } from "../components/TrackRow";
import { usePlayerStore } from "../store/player-store";

type Tab = "playlists" | "albums" | "liked";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (activeTab === "playlists") {
      api
        .get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
        .then((data) => setPlaylists(data.items))
        .catch(() => {});
    } else if (activeTab === "albums") {
      api
        .get<SpotifyPaginated<{ album: SpotifyAlbumSimplified }>>("/v1/me/albums", { limit: "50" })
        .then((data) => setAlbums(data.items.map((i) => i.album)))
        .catch(() => {});
    } else if (activeTab === "liked") {
      api
        .get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", { limit: "50" })
        .then((data) => setLikedSongs(data.items.map((i) => i.track)))
        .catch(() => {});
    }
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "liked", label: "Liked Songs" },
  ];

  const playTrack = async (uri: string, contextUri?: string) => {
    const body: Record<string, unknown> = {};
    if (contextUri) {
      body.context_uri = contextUri;
      body.offset = { uri };
    } else {
      body.uris = [uri];
    }
    await api.put("/v1/me/player/play", body);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-all ${
              activeTab === tab.key
                ? "bg-[var(--theme-accent)] text-white shadow-md"
                : "bg-white/30 text-[var(--color-text-secondary)] hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "playlists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((pl) => (
            <AlbumCard
              key={pl.id}
              id={pl.id}
              name={pl.name}
              imageUrl={pl.images?.[0]?.url}
              subtitle={`${pl.tracks.total} tracks`}
              linkTo={`/playlist/${pl.id}`}
            />
          ))}
        </div>
      )}

      {activeTab === "albums" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              id={album.id}
              name={album.name}
              imageUrl={album.images?.[0]?.url}
              subtitle={album.artists.map((a) => a.name).join(", ")}
              linkTo={`/album/${album.id}`}
            />
          ))}
        </div>
      )}

      {activeTab === "liked" && (
        <div className="flex flex-col">
          {likedSongs.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isPlaying={currentTrack?.id === track.id}
              onPlay={() => playTrack(track.uri)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify library view renders**

Run: `npm run dev`
Expected: After Spotify login, the library page shows three tabs. Clicking tabs loads playlists/albums/liked songs.

- [ ] **Step 3: Commit**

```bash
git add src/views/LibraryView.tsx
git commit -m "feat: implement library view with playlists, albums, and liked songs tabs"
```

---

### Task 17: Search View

**Files:**
- Modify: `src/views/SearchView.tsx`
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: Implement SearchBar**

Create `src/components/SearchBar.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({ onSearch, debounceMs = 400 }: SearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      onSearch("");
      return;
    }
    timerRef.current = setTimeout(() => onSearch(value.trim()), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [value, debounceMs, onSearch]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search for songs, albums, or artists..."
      className="w-full rounded-2xl border border-white/30 bg-white/40 px-5 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] backdrop-blur-sm transition-all focus:border-[var(--theme-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/20"
    />
  );
}
```

- [ ] **Step 2: Implement SearchView**

Replace `src/views/SearchView.tsx`:

```tsx
import { useState, useCallback } from "react";
import { SearchBar } from "../components/SearchBar";
import { AlbumCard } from "../components/AlbumCard";
import { TrackRow } from "../components/TrackRow";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifySearchResult } from "../types/spotify";

export function SearchView() {
  const [results, setResults] = useState<SpotifySearchResult | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setResults(null);
      return;
    }
    try {
      const data = await api.get<SpotifySearchResult>("/v1/search", {
        q: query,
        type: "track,album,artist",
        limit: "20",
      });
      setResults(data);
    } catch {
      // Search failed
    }
  }, []);

  const playTrack = async (uri: string) => {
    await api.put("/v1/me/player/play", { uris: [uri] });
  };

  return (
    <div className="flex flex-col gap-6">
      <SearchBar onSearch={handleSearch} />

      {results?.tracks && results.tracks.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Tracks</h2>
          <div className="flex flex-col">
            {results.tracks.items.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isPlaying={currentTrack?.id === track.id}
                onPlay={() => playTrack(track.uri)}
              />
            ))}
          </div>
        </section>
      )}

      {results?.albums && results.albums.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Albums</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.albums.items.map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                name={album.name}
                imageUrl={album.images?.[0]?.url}
                subtitle={album.artists.map((a) => a.name).join(", ")}
                linkTo={`/album/${album.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {results?.artists && results.artists.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Artists</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.artists.items.map((artist) => (
              <AlbumCard
                key={artist.id}
                id={artist.id}
                name={artist.name}
                imageUrl={artist.images?.[0]?.url}
                subtitle={`${artist.followers.total.toLocaleString()} followers`}
                linkTo={`/artist/${artist.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {!results && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
          <span className="mb-2 text-4xl">🔍</span>
          <p className="text-sm">Search for your favorite music</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchBar.tsx src/views/SearchView.tsx
git commit -m "feat: implement search view with debounced input and filtered results"
```

---

### Task 18: Album & Playlist Detail Views

**Files:**
- Modify: `src/views/AlbumDetailView.tsx`, `src/views/PlaylistDetailView.tsx`

- [ ] **Step 1: Implement AlbumDetailView**

Replace `src/views/AlbumDetailView.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyAlbumFull } from "../types/spotify";

export function AlbumDetailView() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<SpotifyAlbumFull | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyAlbumFull>(`/v1/albums/${id}`).then(setAlbum).catch(() => {});
  }, [id]);

  if (!album) return null;

  const playAlbum = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: album.uri };
    if (trackUri) body.offset = { uri: trackUri };
    await api.put("/v1/me/player/play", body);
  };

  const imageUrl = album.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex gap-6">
        {imageUrl && (
          <img src={imageUrl} alt={album.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />
        )}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {album.album_type}
          </p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{album.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {album.artists.map((a) => (
              <Link key={a.id} to={`/artist/${a.id}`} className="hover:underline">
                {a.name}
              </Link>
            ))}
            {" · "}{album.release_date.split("-")[0]}
            {" · "}{album.total_tracks} tracks
          </p>
          <button
            onClick={() => playAlbum()}
            className="mt-2 w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
          >
            ▶ Play
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex flex-col">
        {album.tracks.items.map((track, i) => (
          <TrackRow
            key={track.id}
            track={{ ...track, album }}
            index={i}
            isPlaying={currentTrack?.id === track.id}
            onPlay={() => playAlbum(track.uri)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement PlaylistDetailView**

Replace `src/views/PlaylistDetailView.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyPlaylist, SpotifyPlaylistTrackItem, SpotifyPaginated } from "../types/spotify";

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyPlaylistTrackItem[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
    api
      .get<SpotifyPaginated<SpotifyPlaylistTrackItem>>(`/v1/playlists/${id}/tracks`, { limit: "100" })
      .then((data) => setTracks(data.items))
      .catch(() => {});
  }, [id]);

  if (!playlist) return null;

  const playPlaylist = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: playlist.uri };
    if (trackUri) body.offset = { uri: trackUri };
    await api.put("/v1/me/player/play", body);
  };

  const imageUrl = playlist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex gap-6">
        {imageUrl && (
          <img src={imageUrl} alt={playlist.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />
        )}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{playlist.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {playlist.owner.display_name} · {playlist.tracks.total} tracks
          </p>
          {playlist.description && (
            <p className="text-xs text-[var(--color-text-muted)]">{playlist.description}</p>
          )}
          <button
            onClick={() => playPlaylist()}
            className="mt-2 w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
          >
            ▶ Play
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex flex-col">
        {tracks.map(
          (item, i) =>
            item.track && (
              <TrackRow
                key={`${item.track.id}-${i}`}
                track={item.track}
                index={i}
                isPlaying={currentTrack?.id === item.track.id}
                onPlay={() => playPlaylist(item.track!.uri)}
              />
            ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/views/AlbumDetailView.tsx src/views/PlaylistDetailView.tsx
git commit -m "feat: implement album and playlist detail views with track listing"
```

---

### Task 19: Artist View

**Files:**
- Modify: `src/views/ArtistView.tsx`

- [ ] **Step 1: Implement ArtistView**

Replace `src/views/ArtistView.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyArtist, SpotifyTrack, SpotifyAlbumSimplified, SpotifyPaginated } from "../types/spotify";

export function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyArtist>(`/v1/artists/${id}`).then(setArtist).catch(() => {});
    api
      .get<{ tracks: SpotifyTrack[] }>(`/v1/artists/${id}/top-tracks`, { market: "from_token" })
      .then((data) => setTopTracks(data.tracks))
      .catch(() => {});
    api
      .get<SpotifyPaginated<SpotifyAlbumSimplified>>(`/v1/artists/${id}/albums`, {
        include_groups: "album,single,compilation",
        limit: "50",
      })
      .then((data) => setAlbums(data.items))
      .catch(() => {});
  }, [id]);

  if (!artist) return null;

  const playTrack = async (uri: string) => {
    await api.put("/v1/me/player/play", { uris: [uri] });
  };

  const imageUrl = artist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end gap-6">
        {imageUrl && (
          <img src={imageUrl} alt={artist.name} className="glow h-48 w-48 shrink-0 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">{artist.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {artist.followers.total.toLocaleString()} followers
          </p>
        </div>
      </div>

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Top Tracks</h2>
          <div className="flex flex-col">
            {topTracks.slice(0, 5).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isPlaying={currentTrack?.id === track.id}
                onPlay={() => playTrack(track.uri)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discography */}
      {albums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Discography</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                name={album.name}
                imageUrl={album.images?.[0]?.url}
                subtitle={`${album.release_date.split("-")[0]} · ${album.album_type}`}
                linkTo={`/album/${album.id}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/ArtistView.tsx
git commit -m "feat: implement artist view with top tracks and discography"
```

---

### Task 20: Device Picker Component

**Files:**
- Create: `src/components/DevicePicker.tsx`

- [ ] **Step 1: Implement DevicePicker**

Create `src/components/DevicePicker.tsx`:

```tsx
import type { SpotifyDevice } from "../types/spotify";

interface DevicePickerProps {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (deviceId: string, deviceName: string) => void;
  onClose: () => void;
}

export function DevicePicker({ devices, activeDeviceId, onSelectDevice, onClose }: DevicePickerProps) {
  const deviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "computer":
        return "💻";
      case "smartphone":
        return "📱";
      case "speaker":
        return "🔊";
      case "tv":
        return "📺";
      default:
        return "🎵";
    }
  };

  return (
    <div className="glass-panel absolute bottom-full right-0 mb-2 w-64 p-2 shadow-xl">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          Connect to a device
        </p>
        <button onClick={onClose} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ✕
        </button>
      </div>
      {devices.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-[var(--color-text-muted)]">
          No devices found. Open Spotify on a device to see it here.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => device.id && onSelectDevice(device.id, device.name)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                device.id === activeDeviceId
                  ? "bg-[var(--theme-accent)]/20 text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-white/30"
              }`}
            >
              <span className="text-lg">{deviceIcon(device.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{device.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{device.type}</p>
              </div>
              {device.is_active && (
                <span className="text-xs text-[var(--theme-accent)]">Active</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DevicePicker.tsx
git commit -m "feat: implement device picker dropdown for Spotify Connect"
```

---

### Task 21: Now Playing & Mini Player

**Files:**
- Modify: `src/components/MiniPlayer.tsx`
- Create: `src/components/NowPlaying.tsx`

- [ ] **Step 1: Implement NowPlaying overlay**

Create `src/components/NowPlaying.tsx`:

```tsx
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
  const { currentTrack, isPlaying, progressMs, durationMs, shuffleState, repeatState } =
    usePlayerStore();

  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)] p-8">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 text-lg text-[var(--color-text-muted)] transition-opacity hover:opacity-70"
      >
        ✕
      </button>

      {/* Album art */}
      {albumArt && (
        <img
          src={albumArt}
          alt=""
          className="glow mb-8 h-72 w-72 rounded-3xl object-cover sm:h-80 sm:w-80 lg:h-96 lg:w-96"
        />
      )}

      {/* Track info */}
      <div className="mb-6 text-center">
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">
          {currentTrack?.name ?? "Not playing"}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {currentTrack?.artists?.map((a) => a.name).join(", ")}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {currentTrack?.album?.name}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-6">
        <button className={`text-lg ${shuffleState ? "opacity-100" : "opacity-40"}`}>🔀</button>
        <button onClick={playback.previousTrack} className="text-2xl transition-opacity hover:opacity-70">
          ⏮
        </button>
        <button
          onClick={playback.togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-accent)] text-2xl text-white shadow-lg transition-all hover:scale-105"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={playback.nextTrack} className="text-2xl transition-opacity hover:opacity-70">
          ⏭
        </button>
        <button className={`text-lg ${repeatState !== "off" ? "opacity-100" : "opacity-40"}`}>🔁</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement MiniPlayer**

Replace `src/components/MiniPlayer.tsx`:

```tsx
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
      {/* Album art */}
      {albumArt && (
        <img
          src={albumArt}
          alt=""
          className="glow w-full max-w-xs rounded-3xl object-cover"
        />
      )}

      {/* Track info */}
      <div className="w-full max-w-xs text-center">
        <p className="truncate text-lg font-medium text-[var(--color-text-primary)]">
          {currentTrack?.name ?? "Not playing"}
        </p>
        <p className="truncate text-sm text-[var(--color-text-secondary)]">
          {currentTrack?.artists?.map((a) => a.name).join(", ")}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-xs">
        <ProgressBar progressMs={progressMs} durationMs={durationMs} onSeek={playback.seek} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button onClick={playback.previousTrack} className="text-xl transition-opacity hover:opacity-70">
          ⏮
        </button>
        <button
          onClick={playback.togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-accent)] text-xl text-white shadow-md transition-all hover:scale-105"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={playback.nextTrack} className="text-xl transition-opacity hover:opacity-70">
          ⏭
        </button>
      </div>

      {/* Expand button */}
      <button
        onClick={onToggleMode}
        className="text-xs text-[var(--color-text-muted)] transition-opacity hover:opacity-70"
      >
        🔼 Full mode
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NowPlaying.tsx src/components/MiniPlayer.tsx
git commit -m "feat: implement now playing overlay and mini player mode"
```

---

### Task 22: Wire Up App.tsx with All Components

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx with complete wiring**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { useState } from "react";
import { useSpotifyAuth } from "./hooks/use-spotify-auth";
import { usePlayback } from "./hooks/use-playback";
import { useTheme } from "./hooks/use-theme";
import { useDevices } from "./hooks/use-devices";
import { Sidebar } from "./components/Sidebar";
import { PlayerBar } from "./components/PlayerBar";
import { MiniPlayer } from "./components/MiniPlayer";
import { NowPlaying } from "./components/NowPlaying";
import { DevicePicker } from "./components/DevicePicker";
import { LoginView } from "./views/LoginView";
import { LibraryView } from "./views/LibraryView";
import { SearchView } from "./views/SearchView";
import { PlaylistDetailView } from "./views/PlaylistDetailView";
import { AlbumDetailView } from "./views/AlbumDetailView";
import { ArtistView } from "./views/ArtistView";
import { usePlayerStore } from "./store/player-store";

function AppLayout({ playback, miniMode, setMiniMode }: {
  playback: ReturnType<typeof usePlayback>;
  miniMode: boolean;
  setMiniMode: (v: boolean) => void;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { devices, transferPlayback } = useDevices();
  const activeDeviceId = usePlayerStore((s) => s.activeDeviceId);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 gap-2 overflow-hidden p-2 pb-0">
        {/* Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Main content */}
        <main className="glass-panel flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Now Playing overlay */}
      {showNowPlaying && (
        <NowPlaying playback={playback} onClose={() => setShowNowPlaying(false)} />
      )}

      {/* Player bar */}
      <div className="relative">
        {showDevices && (
          <div className="absolute bottom-full right-4">
            <DevicePicker
              devices={devices}
              activeDeviceId={activeDeviceId}
              onSelectDevice={(id, name) => {
                transferPlayback(id, name);
                setShowDevices(false);
              }}
              onClose={() => setShowDevices(false)}
            />
          </div>
        )}
        <PlayerBar
          playback={playback}
          onToggleMode={() => setMiniMode(true)}
          onOpenDevices={() => setShowDevices(!showDevices)}
          onOpenNowPlaying={() => setShowNowPlaying(true)}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, login } = useSpotifyAuth();
  const playback = usePlayback();
  const [miniMode, setMiniMode] = useState(false);
  useTheme();

  if (!isAuthenticated) {
    return <LoginView onLogin={login} />;
  }

  if (miniMode) {
    return <MiniPlayer playback={playback} onToggleMode={() => setMiniMode(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout playback={playback} miniMode={miniMode} setMiniMode={setMiniMode} />}>
          <Route path="/" element={<LibraryView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/playlist/:id" element={<PlaylistDetailView />} />
          <Route path="/album/:id" element={<AlbumDetailView />} />
          <Route path="/artist/:id" element={<ArtistView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Delete the now-unnecessary LayoutShell.tsx**

Remove `src/components/LayoutShell.tsx` — its logic is now inlined in `App.tsx`'s `AppLayout`.

```bash
rm src/components/LayoutShell.tsx
```

- [ ] **Step 3: Verify the full app runs**

Run: `npm run dev`
Expected: Login screen → after auth → library view with sidebar, player bar, device picker. All routes navigable.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git add -u
git commit -m "feat: wire up complete app with all views, player bar, and device picker"
```

---

### Task 23: Remote Playback Polling

**Files:**
- Create: `src/hooks/use-remote-polling.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement remote playback state polling hook**

Create `src/hooks/use-remote-polling.ts`:

```ts
import { useEffect } from "react";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifyPlaybackState } from "../types/spotify";

export function useRemotePolling() {
  const isLocalPlayback = usePlayerStore((s) => s.isLocalPlayback);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setTrack, setPlaybackState, setShuffle, setRepeat, setDevice } = usePlayerStore();

  useEffect(() => {
    if (isLocalPlayback || !accessToken) return;

    const api = createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    );

    const poll = async () => {
      try {
        const state = await api.get<SpotifyPlaybackState>("/v1/me/player");
        if (!state) return;
        if (state.item) setTrack(state.item);
        setPlaybackState(state.is_playing, state.progress_ms ?? 0);
        setShuffle(state.shuffle_state);
        setRepeat(state.repeat_state);
        setDevice(
          state.device.id,
          state.device.name,
          state.device.name === "Spotlite",
        );
      } catch {
        // Poll failed, will retry
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [isLocalPlayback, accessToken, setTrack, setPlaybackState, setShuffle, setRepeat, setDevice]);
}
```

- [ ] **Step 2: Add hook to App.tsx**

In `src/App.tsx`, import and call the hook inside the `App` component, after `useTheme()`:

```ts
import { useRemotePolling } from "./hooks/use-remote-polling";
```

Add after `useTheme();`:
```ts
useRemotePolling();
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-remote-polling.ts src/App.tsx
git commit -m "feat: add remote playback state polling for Spotify Connect devices"
```

---

### Task 24: Progress Bar Local Interpolation

**Files:**
- Modify: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Add local time interpolation**

The progress bar should smoothly advance between poll/SDK updates. Replace `src/components/ProgressBar.tsx`:

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
  const lastUpdateRef = useRef(Date.now());

  // Sync with store updates
  useEffect(() => {
    setDisplayMs(progressMs);
    lastUpdateRef.current = Date.now();
  }, [progressMs]);

  // Local interpolation when playing
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
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <span className="w-10 text-right">{formatTime(displayMs)}</span>
      <div
        ref={barRef}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/30"
        onClick={handleClick}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--theme-accent)]"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ left: `${percent}%`, marginLeft: "-6px" }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgressBar.tsx
git commit -m "feat: add smooth local progress interpolation to progress bar"
```

---

### Task 25: Tauri 2 Desktop Setup

**Files:**
- Create: `src-tauri/` directory (Tauri init)
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Install Tauri CLI**

```bash
npm install -D @tauri-apps/cli@latest
```

- [ ] **Step 2: Initialize Tauri in the project**

```bash
npx tauri init
```

When prompted:
- App name: `Spotlite`
- Window title: `Spotlite`
- Web assets path: `../dist`
- Dev server URL: `http://localhost:5173`
- Dev command: `npm run dev`
- Build command: `npm run build`

- [ ] **Step 3: Update tauri.conf.json for app settings**

Edit `src-tauri/tauri.conf.json` — update the window config:

```json
{
  "app": {
    "windows": [
      {
        "title": "Spotlite",
        "width": 1200,
        "height": 800,
        "minWidth": 400,
        "minHeight": 300,
        "decorations": true,
        "resizable": true
      }
    ]
  }
}
```

- [ ] **Step 4: Add Tauri scripts to package.json**

Add to `package.json` scripts:
```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 5: Verify Tauri dev builds**

Run: `npm run tauri:dev`
Expected: A native window opens showing the Spotlite web app.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/ package.json package-lock.json
git commit -m "feat: add Tauri 2 desktop app configuration"
```

---

### Task 26: Final Integration Test & Cleanup

**Files:**
- Modify: various (cleanup)

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Clean build in `dist/`.

- [ ] **Step 4: Remove default Vite template files**

Delete any leftover Vite starter files (e.g., `src/App.css`, `src/assets/react.svg`, etc.) that aren't used:

```bash
rm -f src/App.css src/assets/react.svg
```

- [ ] **Step 5: Verify .gitignore includes Tauri build artifacts**

Append to `.gitignore` if not already present:

```
src-tauri/target/
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused template files and finalize project"
```
