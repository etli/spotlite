# Playlist Access, Library Sort, Back Nav, and Add Toast — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 403s on collaborative playlists, sort all three library tabs by most recently added or played, move the back button to the fixed panel header, and show a toast on successful track-add.

**Architecture:** New scopes added to PKCE auth; a tiny Zustand toast store + ToastContainer slot into the existing PanelShell header; a pure `buildPlayedAtMaps` helper drives library sorting via `useMemo`; back-button logic lifted out of individual views into PanelShell using `useLocation`.

**Tech Stack:** React 18, Zustand, React Router 7, Vitest + jsdom, Tailwind CSS 4, Spotify Web API.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/spotify-auth.ts` | Modify | Add 2 new OAuth scopes |
| `src/types/spotify.ts` | Modify | Add `SpotifyPlayContext`, `SpotifyPlayHistory` types |
| `src/store/toast-store.ts` | Create | Zustand store: push/dismiss toasts |
| `src/components/ToastContainer.tsx` | Create | Renders + auto-dismisses toasts from the store |
| `src/components/PanelShell.tsx` | Modify | Add back button + render ToastContainer in fixed header |
| `src/views/PlaylistDetailView.tsx` | Modify | Remove back button; add `fetchError` state for 403 |
| `src/views/LikedSongsView.tsx` | Modify | Remove back button |
| `src/views/AlbumDetailView.tsx` | Modify | Remove back button |
| `src/views/ArtistView.tsx` | Modify | Remove back button |
| `src/lib/recently-played.ts` | Create | Pure `buildPlayedAtMaps` helper |
| `src/views/LibraryView.tsx` | Modify | Fetch recently-played once; sort all three tabs |
| `src/components/TrackContextMenu.tsx` | Modify | Call toast store on successful track add |
| `src/lib/__tests__/spotify-auth.test.ts` | Modify | Assert new scopes present |
| `src/store/__tests__/toast-store.test.ts` | Create | Unit tests for push/dismiss |
| `src/lib/__tests__/recently-played.test.ts` | Create | Unit tests for `buildPlayedAtMaps` |

---

### Task 1: Add new OAuth scopes and Spotify types

**Files:**
- Modify: `src/lib/spotify-auth.ts`
- Modify: `src/types/spotify.ts`
- Modify: `src/lib/__tests__/spotify-auth.test.ts`

- [ ] **Step 1: Add failing assertions for the new scopes**

Append to `src/lib/__tests__/spotify-auth.test.ts` inside the existing `describe("buildAuthUrl", ...)` block, or add a new `describe` block after it:

```ts
describe("SCOPES", () => {
  it("includes playlist-read-collaborative", () => {
    expect(SCOPES).toContain("playlist-read-collaborative");
  });

  it("includes user-read-recently-played", () => {
    expect(SCOPES).toContain("user-read-recently-played");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run src/lib/__tests__/spotify-auth.test.ts
```

Expected: 2 failures — `playlist-read-collaborative` and `user-read-recently-played` not in SCOPES.

- [ ] **Step 3: Add the two scopes to `src/lib/spotify-auth.ts`**

```ts
export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  "user-library-modify",
  "user-follow-read",
  "user-follow-modify",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
];
```

- [ ] **Step 4: Add `SpotifyPlayContext` and `SpotifyPlayHistory` to `src/types/spotify.ts`**

Append at the end of the file:

```ts
export interface SpotifyPlayContext {
  type: "artist" | "playlist" | "album";
  uri: string;
}

export interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string; // ISO 8601
  context: SpotifyPlayContext | null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/spotify-auth.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/spotify-auth.ts src/types/spotify.ts src/lib/__tests__/spotify-auth.test.ts
git commit -m "feat: add playlist-read-collaborative and user-read-recently-played scopes"
```

---

### Task 2: Toast Zustand store

**Files:**
- Create: `src/store/toast-store.ts`
- Create: `src/store/__tests__/toast-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/toast-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../toast-store";

describe("toast-store", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("starts with no toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("push adds a toast with the given message", () => {
    useToastStore.getState().push("Added to My Playlist");
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Added to My Playlist");
    expect(typeof toasts[0].id).toBe("string");
  });

  it("push assigns unique IDs across multiple calls", () => {
    useToastStore.getState().push("First");
    useToastStore.getState().push("Second");
    const { toasts } = useToastStore.getState();
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });

  it("dismiss removes only the toast with the given ID", () => {
    useToastStore.getState().push("First");
    useToastStore.getState().push("Second");
    const firstId = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(firstId);
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Second");
  });

  it("dismiss on unknown ID is a no-op", () => {
    useToastStore.getState().push("Hello");
    useToastStore.getState().dismiss("nonexistent-id");
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run src/store/__tests__/toast-store.test.ts
```

Expected: module not found error.

- [ ] **Step 3: Implement `src/store/toast-store.ts`**

```ts
import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message }],
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/store/__tests__/toast-store.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/toast-store.ts src/store/__tests__/toast-store.test.ts
git commit -m "feat: add toast Zustand store with push/dismiss"
```

---

### Task 3: ToastContainer component + PanelShell integration

**Files:**
- Create: `src/components/ToastContainer.tsx`
- Modify: `src/components/PanelShell.tsx`

- [ ] **Step 1: Create `src/components/ToastContainer.tsx`**

```tsx
import { useEffect } from "react";
import { useToastStore } from "../store/toast-store";

function ToastItem({ id, message }: { id: string; message: string }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 2500);
    return () => clearTimeout(timer);
  }, [id, dismiss]);
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[9px] text-[var(--color-text-primary)] shadow-[2px_2px_0_var(--theme-shadow)]">
      {message}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/PanelShell.tsx`**

Replace the entire file:

```tsx
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "../views/SearchResults";
import { ToastContainer } from "./ToastContainer";

export function PanelShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleTitleClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  const showBack = location.pathname !== "/";
  const goBack = () => {
    if (location.key === "default") navigate("/");
    else navigate(-1);
  };

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
        {showBack && (
          <button
            onClick={goBack}
            aria-label="Go back"
            className="flex items-center gap-1 text-[9px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <span className="text-[14px]">←</span> Back
          </button>
        )}
        <button
          onClick={handleTitleClick}
          className="text-[11px] tracking-widest text-[var(--color-text-primary)] transition-opacity hover:opacity-70"
        >
          <span className="text-[15px]">✦</span> spotlite
        </button>
        <div className="ml-auto">
          <ToastContainer />
        </div>
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

- [ ] **Step 3: Run the full test suite to confirm nothing is broken**

```bash
npm run test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ToastContainer.tsx src/components/PanelShell.tsx
git commit -m "feat: add ToastContainer and back button to PanelShell fixed header"
```

---

### Task 4: Remove back buttons from individual views

**Files:**
- Modify: `src/views/PlaylistDetailView.tsx`
- Modify: `src/views/LikedSongsView.tsx`
- Modify: `src/views/AlbumDetailView.tsx`
- Modify: `src/views/ArtistView.tsx`

- [ ] **Step 1: Remove back button from `PlaylistDetailView`**

Remove these imports and lines from `src/views/PlaylistDetailView.tsx`:

Remove `useLocation` from the react-router-dom import (keep `useNavigate` — it's still used for `navigate("/")` after delete):

```ts
// Before:
import { useParams, useNavigate, useLocation } from "react-router-dom";
// After:
import { useParams, useNavigate } from "react-router-dom";
```

Remove the `location` variable and `goBack` function:

```ts
// Remove these lines:
const location = useLocation();
const goBack = () => {
  if (location.key === "default") navigate("/");
  else navigate(-1);
};
```

Remove the back button JSX (the `<button onClick={goBack} ...>` block with the `←` arrow and "Back" text that appears just before the `<div className="flex gap-6">`).

- [ ] **Step 2: Remove back button from `LikedSongsView`**

In `src/views/LikedSongsView.tsx`:

Remove `useLocation` from the import:
```ts
// Before:
import { useNavigate, useLocation } from "react-router-dom";
// After:
import { useNavigate } from "react-router-dom";
```

Remove these lines:
```ts
const location = useLocation();
const goBack = () => {
  if (location.key === "default") navigate("/");
  else navigate(-1);
};
```

Remove the back button JSX element (`<button onClick={goBack} ...>← Back</button>`).

- [ ] **Step 3: Remove back button from `AlbumDetailView`**

In `src/views/AlbumDetailView.tsx`:

Remove `useLocation` from the import:
```ts
// Before:
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
// After:
import { useParams, useNavigate, Link } from "react-router-dom";
```

Remove these lines:
```ts
const location = useLocation();
const goBack = () => {
  if (location.key === "default") navigate("/");
  else navigate(-1);
};
```

Remove the back button JSX element.

- [ ] **Step 4: Remove back button from `ArtistView`**

In `src/views/ArtistView.tsx`:

Remove `useLocation` from the import:
```ts
// Before:
import { useParams, useNavigate, useLocation } from "react-router-dom";
// After:
import { useParams, useNavigate } from "react-router-dom";
```

Remove these lines:
```ts
const location = useLocation();
const goBack = () => {
  if (location.key === "default") navigate("/");
  else navigate(-1);
};
```

Remove the back button JSX element.

- [ ] **Step 5: Also remove unused `navigate` if no longer needed in a view**

Check each view after removing `goBack`. If `navigate` is no longer called anywhere else in the view, remove it from the destructure and the `useNavigate` import. (In `PlaylistDetailView`, `navigate` is still used inside `handleDelete` — keep it. In the others, check manually.)

`LikedSongsView` — `navigate` is only used in `goBack`. Remove `useNavigate` import and call.
`AlbumDetailView` — `navigate` is only used in `goBack`. Remove `useNavigate` import and call.
`ArtistView` — `navigate` is only used in `goBack`. Remove `useNavigate` import and call.

- [ ] **Step 6: Run tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/views/PlaylistDetailView.tsx src/views/LikedSongsView.tsx src/views/AlbumDetailView.tsx src/views/ArtistView.tsx
git commit -m "refactor: remove back buttons from views — now handled by PanelShell"
```

---

### Task 5: Error handling in PlaylistDetailView for 403

**Files:**
- Modify: `src/views/PlaylistDetailView.tsx`

- [ ] **Step 1: Add `fetchError` state**

In `PlaylistDetailView`, add a new state variable after the existing state declarations:

```ts
const [fetchError, setFetchError] = useState<string | null>(null);
```

- [ ] **Step 2: Catch items fetch errors and set `fetchError`**

Replace the current items fetch `.catch(() => {})` in the `useEffect` with:

```ts
.catch((err) => {
  const statusMatch = /Spotify API error: (\d+)/.exec((err as Error).message);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  setFetchError(
    status === 403
      ? "This playlist isn't accessible."
      : "Couldn't load tracks. Please try again.",
  );
})
```

The full `useEffect` after the change:

```ts
useEffect(() => {
  if (!id) return;
  api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
  api.get<SpotifyPaginated<SpotifyPlaylistItem>>(`/v1/playlists/${id}/items`, { limit: "50" })
    .then((data) => {
      setTracks(data.items.filter((item) => item.item != null));
      setFetchedOffset(data.items.length);
      setHasMore(data.next !== null);
    })
    .catch((err) => {
      const statusMatch = /Spotify API error: (\d+)/.exec((err as Error).message);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      setFetchError(
        status === 403
          ? "This playlist isn't accessible."
          : "Couldn't load tracks. Please try again.",
      );
    });
}, [id, api]);
```

- [ ] **Step 3: Render the error in place of the track list**

Replace the track list section (the `<div className="flex flex-col">` containing the `tracks.map(...)`) with a conditional:

```tsx
{fetchError ? (
  <p className="py-4 text-sm text-[var(--color-text-secondary)]">{fetchError}</p>
) : (
  <div className="flex flex-col">
    {tracks.map((item, i) => item.item && (
      <TrackRow
        key={`${item.item.id}-${i}`}
        track={item.item}
        index={i}
        isPlaying={currentTrack?.id === item.item.id}
        onPlay={() => playPlaylist(item.item!.uri)}
        onContextMenu={handleContextMenu}
      />
    ))}
  </div>
)}
```

Also hide the "Load 50 more" button when `fetchError` is set — wrap the existing `{hasMore && ...}` block:

```tsx
{!fetchError && hasMore && (
  <div className="flex justify-center py-2">
    ...
  </div>
)}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/views/PlaylistDetailView.tsx
git commit -m "fix: surface 403 error in PlaylistDetailView instead of silent blank screen"
```

---

### Task 6: `buildPlayedAtMaps` helper

**Files:**
- Create: `src/lib/recently-played.ts`
- Create: `src/lib/__tests__/recently-played.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/recently-played.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildPlayedAtMaps } from "../recently-played";
import type { SpotifyPlayHistory } from "../../types/spotify";

const baseTrack: SpotifyPlayHistory["track"] = {
  id: "t1",
  name: "Track",
  uri: "spotify:track:t1",
  duration_ms: 200000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist One", uri: "spotify:artist:a1" }],
  album: {
    id: "al1", name: "Album", images: [],
    artists: [{ id: "a1", name: "Artist One", uri: "spotify:artist:a1" }],
    release_date: "2024", total_tracks: 10,
    uri: "spotify:album:al1", album_type: "album",
  },
};

const makeEntry = (overrides: Partial<SpotifyPlayHistory>): SpotifyPlayHistory => ({
  track: baseTrack,
  played_at: "2024-01-01T00:00:00Z",
  context: null,
  ...overrides,
});

describe("buildPlayedAtMaps", () => {
  it("returns empty maps for empty history", () => {
    const { albums, playlists, artists } = buildPlayedAtMaps([]);
    expect(albums.size).toBe(0);
    expect(playlists.size).toBe(0);
    expect(artists.size).toBe(0);
  });

  it("maps album URI to played_at date", () => {
    const { albums } = buildPlayedAtMaps([makeEntry({ played_at: "2024-06-15T10:00:00Z" })]);
    expect(albums.get("spotify:album:al1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("maps playlist context URI to played_at date", () => {
    const { playlists } = buildPlayedAtMaps([
      makeEntry({
        played_at: "2024-06-15T10:00:00Z",
        context: { type: "playlist", uri: "spotify:playlist:p1" },
      }),
    ]);
    expect(playlists.get("spotify:playlist:p1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("maps artist ID to played_at date", () => {
    const { artists } = buildPlayedAtMaps([makeEntry({ played_at: "2024-06-15T10:00:00Z" })]);
    expect(artists.get("a1")).toEqual(new Date("2024-06-15T10:00:00Z"));
  });

  it("keeps the most recent played_at when the same album appears multiple times (API is newest-first)", () => {
    const history = [
      makeEntry({ played_at: "2024-06-20T00:00:00Z" }),
      makeEntry({ played_at: "2024-06-01T00:00:00Z" }),
    ];
    const { albums } = buildPlayedAtMaps(history);
    expect(albums.get("spotify:album:al1")).toEqual(new Date("2024-06-20T00:00:00Z"));
  });

  it("does not add to playlists map for non-playlist contexts", () => {
    const { playlists } = buildPlayedAtMaps([
      makeEntry({ context: { type: "album", uri: "spotify:album:al1" } }),
    ]);
    expect(playlists.size).toBe(0);
  });

  it("maps all artists from a multi-artist track", () => {
    const multiArtistTrack: SpotifyPlayHistory["track"] = {
      ...baseTrack,
      artists: [
        { id: "a1", name: "Artist One", uri: "spotify:artist:a1" },
        { id: "a2", name: "Artist Two", uri: "spotify:artist:a2" },
      ],
    };
    const { artists } = buildPlayedAtMaps([makeEntry({ track: multiArtistTrack })]);
    expect(artists.has("a1")).toBe(true);
    expect(artists.has("a2")).toBe(true);
  });

  it("does not add to playlists map when context is null", () => {
    const { playlists } = buildPlayedAtMaps([makeEntry({ context: null })]);
    expect(playlists.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run src/lib/__tests__/recently-played.test.ts
```

Expected: module not found error.

- [ ] **Step 3: Implement `src/lib/recently-played.ts`**

```ts
import type { SpotifyPlayHistory } from "../types/spotify";

export interface PlayedAtMaps {
  albums: Map<string, Date>;
  playlists: Map<string, Date>;
  artists: Map<string, Date>;
}

/**
 * Builds lookup maps of URI/ID → most recent played_at date from Spotify history.
 * The API returns items newest-first, so the first occurrence of each key is kept.
 */
export function buildPlayedAtMaps(history: SpotifyPlayHistory[]): PlayedAtMaps {
  const albums = new Map<string, Date>();
  const playlists = new Map<string, Date>();
  const artists = new Map<string, Date>();

  for (const entry of history) {
    const playedAt = new Date(entry.played_at);

    if (!albums.has(entry.track.album.uri)) {
      albums.set(entry.track.album.uri, playedAt);
    }

    if (entry.context?.type === "playlist" && !playlists.has(entry.context.uri)) {
      playlists.set(entry.context.uri, playedAt);
    }

    for (const artist of entry.track.artists) {
      if (!artists.has(artist.id)) {
        artists.set(artist.id, playedAt);
      }
    }
  }

  return { albums, playlists, artists };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/recently-played.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recently-played.ts src/lib/__tests__/recently-played.test.ts
git commit -m "feat: add buildPlayedAtMaps helper for library sort"
```

---

### Task 7: LibraryView — fetch recently-played and sort all three tabs

**Files:**
- Modify: `src/views/LibraryView.tsx`

- [ ] **Step 1: Replace `src/views/LibraryView.tsx` with the updated version**

```tsx
import { useState, useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import { CreatePlaylistModal } from "../components/CreatePlaylistModal";
import { buildPlayedAtMaps } from "../lib/recently-played";
import type { SpotifyPlaylist, SpotifyAlbumSimplified, SpotifyArtist, SpotifyPaginated, SpotifyPlayHistory } from "../types/spotify";

type Tab = "playlists" | "albums" | "artists";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rawPlaylists, setRawPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [rawAlbums, setRawAlbums] = useState<{ album: SpotifyAlbumSimplified; added_at: string }[]>([]);
  const [rawArtists, setRawArtists] = useState<SpotifyArtist[]>([]);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyPlayHistory[]>([]);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    api.get<{ items: SpotifyPlayHistory[] }>("/v1/me/player/recently-played", { limit: "50" })
      .then((data) => setRecentlyPlayed(data.items))
      .catch(() => {}); // degrades gracefully if scope is missing on existing session
  }, [api]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const ignore = (err: unknown) => { if ((err as { name?: string }).name !== "AbortError") console.error(err); };

    if (activeTab === "playlists") {
      api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" }, signal)
        .then((data) => setRawPlaylists(data.items.filter((pl) => pl != null))).catch(ignore);
      if (likedCount === null) {
        api.get<SpotifyPaginated<unknown>>("/v1/me/tracks", { limit: "1" }, signal)
          .then((data) => setLikedCount(data.total)).catch(ignore);
      }
    } else if (activeTab === "albums") {
      api.get<SpotifyPaginated<{ album: SpotifyAlbumSimplified; added_at: string }>>("/v1/me/albums", { limit: "50" }, signal)
        .then((data) => setRawAlbums(data.items)).catch(ignore);
    } else if (activeTab === "artists") {
      api.get<{ artists: SpotifyPaginated<SpotifyArtist> }>("/v1/me/following", { type: "artist", limit: "50" }, signal)
        .then((data) => setRawArtists(data.artists.items)).catch(ignore);
    }
    return () => controller.abort();
  }, [activeTab, api]);

  const playedAtMaps = useMemo(() => buildPlayedAtMaps(recentlyPlayed), [recentlyPlayed]);

  const playlists = useMemo(() =>
    [...rawPlaylists].sort((a, b) => {
      const aTime = playedAtMaps.playlists.get(a.uri)?.getTime() ?? 0;
      const bTime = playedAtMaps.playlists.get(b.uri)?.getTime() ?? 0;
      return bTime - aTime;
    }),
    [rawPlaylists, playedAtMaps]
  );

  const albums = useMemo(() =>
    [...rawAlbums]
      .sort((a, b) => {
        const aTime = Math.max(
          new Date(a.added_at).getTime(),
          playedAtMaps.albums.get(a.album.uri)?.getTime() ?? 0,
        );
        const bTime = Math.max(
          new Date(b.added_at).getTime(),
          playedAtMaps.albums.get(b.album.uri)?.getTime() ?? 0,
        );
        return bTime - aTime;
      })
      .map((i) => i.album),
    [rawAlbums, playedAtMaps]
  );

  const artists = useMemo(() =>
    [...rawArtists].sort((a, b) => {
      const aTime = playedAtMaps.artists.get(a.id)?.getTime() ?? 0;
      const bTime = playedAtMaps.artists.get(b.id)?.getTime() ?? 0;
      return bTime - aTime;
    }),
    [rawArtists, playedAtMaps]
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "artists", label: "Artists" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`border px-4 py-1.5 text-[9px] transition-all ${
              activeTab === tab.key
                ? "border-[var(--color-border)] bg-[var(--theme-accent)] text-white shadow-[2px_2px_0_var(--theme-shadow)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            }`}>{tab.label}</button>
        ))}
        {activeTab === "playlists" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-auto border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-[9px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            + New
          </button>
        )}
      </div>

      {activeTab === "playlists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Link
            to="/liked"
            className="group flex flex-col gap-2 border border-transparent p-3 transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[2px_2px_0_var(--theme-shadow)]"
          >
            <div className="aspect-square overflow-hidden border border-[var(--color-border)] bg-[var(--theme-primary)] flex items-center justify-center">
              <Heart size={32} strokeLinecap="square" strokeLinejoin="miter" className="text-white" />
            </div>
            <div className="min-w-0 px-1">
              <p className="truncate text-[9px] font-medium text-[var(--color-text-primary)]">Liked Songs</p>
              <p className="truncate text-[7px] text-[var(--color-text-secondary)]">{likedCount !== null ? `${likedCount} tracks` : ""}</p>
            </div>
          </Link>
          {playlists.map((pl) => (
            <AlbumCard key={pl.id} id={pl.id} name={pl.name} imageUrl={pl.images?.[0]?.url}
              subtitle={`${pl.items?.total ?? 0} tracks`} linkTo={`/playlist/${pl.id}`} />
          ))}
        </div>
      )}

      {activeTab === "albums" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
              subtitle={album.artists.map((a) => a.name).join(", ")} linkTo={`/album/${album.id}`} />
          ))}
        </div>
      )}

      {activeTab === "artists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {artists.map((artist) => (
            <AlbumCard key={artist.id} id={artist.id} name={artist.name} imageUrl={artist.images?.[0]?.url}
              subtitle={artist.genres?.[0] ?? ""} linkTo={`/artist/${artist.id}`} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePlaylistModal
          onCreated={(playlist) => {
            setRawPlaylists((prev) => [playlist, ...prev]);
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/views/LibraryView.tsx
git commit -m "feat: sort library tabs by most recently added or played"
```

---

### Task 8: Toast on successful track add in TrackContextMenu

**Files:**
- Modify: `src/components/TrackContextMenu.tsx`

- [ ] **Step 1: Import the toast store**

Add to the imports at the top of `src/components/TrackContextMenu.tsx`:

```ts
import { useToastStore } from "../store/toast-store";
```

- [ ] **Step 2: Update `addToPlaylist` in `PlaylistFlyout` to show a toast**

Replace the existing `addToPlaylist` function:

```ts
const addToPlaylist = async (playlistId: string) => {
  const playlistName = playlists.find((p) => p.id === playlistId)?.name ?? "playlist";
  try {
    await api.post(`/v1/playlists/${playlistId}/items`, { uris: [track.uri] });
    useToastStore.getState().push(`Added to ${playlistName}`);
    onClose();
  } catch (err) {
    console.error("Failed to add track to playlist:", err);
  }
};
```

- [ ] **Step 3: Update `addToLikedSongs` in `PlaylistFlyout` to show a toast**

Replace the existing `addToLikedSongs` function:

```ts
const addToLikedSongs = async () => {
  try {
    await api.put("/v1/me/library", undefined, { uris: track.uri });
    useToastStore.getState().push("Added to Liked Songs");
    onClose();
  } catch (err) {
    console.error("Failed to add track to Liked Songs:", err);
  }
};
```

- [ ] **Step 4: Update `handlePlaylistCreated` in `TrackContextMenu` to show a toast**

Replace the existing `handlePlaylistCreated` function:

```ts
const handlePlaylistCreated = async (playlist: SpotifyPlaylist) => {
  try {
    await api.post(`/v1/playlists/${playlist.id}/items`, { uris: [track.uri] });
    useToastStore.getState().push(`Added to ${playlist.name}`);
    setShowCreateModal(false);
    onClose();
  } catch (err) {
    console.error("Failed to add track to playlist:", err);
  }
};
```

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/TrackContextMenu.tsx
git commit -m "feat: show toast notification on successful track add"
```

---

## Manual Verification Checklist

After all tasks are complete, verify in the browser (requires re-login to activate new scopes):

- [ ] Log out and back in to pick up `playlist-read-collaborative` and `user-read-recently-played`
- [ ] Navigate to a collaborative playlist by another user — tracks load without 403
- [ ] Navigate to a genuinely private playlist you don't own — error message shows instead of blank screen
- [ ] Library → Albums tab is ordered by most recently played or added (albums you played today appear first)
- [ ] Library → Playlists tab reorders playlists you've recently played to the top
- [ ] Library → Artists tab reorders recently played artists to the top
- [ ] On any detail view (`/playlist/:id`, `/album/:id`, `/liked`, `/artist/:id`), the Back button appears in the fixed header — not inside the scrollable content
- [ ] Back button navigates to the previous view, not always to `/`
- [ ] Right-click a track → Add to playlist → select a playlist → toast appears top-right: "Added to [name]"
- [ ] Right-click a track → Add to playlist → Liked Songs → toast: "Added to Liked Songs"
- [ ] Toast auto-dismisses after ~2.5 seconds
