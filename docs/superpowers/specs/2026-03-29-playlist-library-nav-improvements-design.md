# Design: Playlist access, library sorting, back nav, and add-to-playlist toast

**Date:** 2026-03-29

---

## Overview

Four improvements to Spotlite's library and navigation experience:

1. Fix 403 errors when loading tracks for collaborative playlists by other users
2. Sort all three library tabs (playlists, albums, artists) by most recently added or played
3. Move the back link out of the scrollable content area into the fixed panel header
4. Show a brief toast notification when a track is successfully added to a playlist or Liked Songs

---

## 1. Fix 403 for collaborative playlists

**Problem:** `GET /v1/playlists/{id}/items` returns 403 for playlists created by other users when those playlists are collaborative. The `playlist-read-collaborative` scope is missing from the app's scope list. Additionally, `PlaylistDetailView` silently swallows errors on both the playlist metadata fetch and the items fetch, leaving users staring at a blank screen.

**Changes:**

- Add `"playlist-read-collaborative"` to `SCOPES` in `src/lib/spotify-auth.ts`.
- Add `"user-read-recently-played"` to `SCOPES` at the same time (required for Issue 2) so users only re-authenticate once.
- In `PlaylistDetailView`, track a `fetchError: string | null` state. If the items fetch returns a non-OK response, set `fetchError` to a human-readable message and render it in place of the track list:
  - 403: "This playlist isn't accessible."
  - Other errors: "Couldn't load tracks. Please try again."
- Note: existing sessions will not gain the new scopes until the user logs out and back in. No special in-app prompt is required — the 403 error message covers the gap.

---

## 2. Library sort by most recently added or played

**Data sources:**

- Albums: `added_at` field is returned by `GET /v1/me/albums` on each saved album item.
- Playlists: no `added_at` in `GET /v1/me/playlists` response.
- Artists: no `added_at` in `GET /v1/me/following` response.
- Recently played: `GET /v1/me/player/recently-played?limit=50` (requires new `user-read-recently-played` scope). Returns up to 50 `PlayHistory` objects with `played_at` (ISO string) and `context` (nullable, has `type` and `uri`), plus the full `track` object.

**Implementation in `LibraryView`:**

- Fetch recently-played once on mount (not per tab switch), stored in component state as `recentlyPlayed`.
- Derive three maps from `recentlyPlayed`:
  - `albumPlayedAt: Map<string, Date>` — keyed by `track.album.uri`, value is the most recent `played_at` for that album.
  - `playlistPlayedAt: Map<string, Date>` — keyed by `context.uri` where `context.type === "playlist"`, value is most recent `played_at`.
  - `artistPlayedAt: Map<string, Date>` — keyed by each `track.artists[j].id`, value is most recent `played_at` for any track by that artist.
- Each map is built by iterating history and keeping only the most recent `played_at` per key (since the API returns items newest-first, the first occurrence of each key wins).

**Sort key:** `max(addedAt ?? EPOCH, playedAt ?? EPOCH)` where `EPOCH = new Date(0)`.

- Albums: `max(new Date(item.added_at), albumPlayedAt.get(album.uri) ?? EPOCH)`
- Playlists: `playlistPlayedAt.get(playlist.uri) ?? EPOCH`
- Artists: `artistPlayedAt.get(artist.id) ?? EPOCH`

All three lists are sorted descending by this key. Playlists and artists with no play history sort to the bottom. Albums always have `added_at` as a floor.

**Failure handling:** If the recently-played fetch fails (e.g. missing scope on an existing session), the maps are empty and the sort degrades gracefully — albums sort by `added_at` only, playlists and artists keep API order.

---

## 3. Back link in fixed panel header

**Current state:** Each detail view (`LikedSongsView`, `PlaylistDetailView`, `AlbumDetailView`, `ArtistView`) renders a back button as the first element inside the scrollable `<Outlet>` area. It scrolls away with content.

**New behaviour:** `PanelShell` renders the back button in its fixed header strip (the `shrink-0` area above the scrollable region). It is only visible on non-root routes.

**Detection:** `PanelShell` uses `useLocation`. If `location.pathname !== "/"`, show the back button.

**Navigation logic** (same as current): if `location.key === "default"`, navigate to `/`; else `navigate(-1)`.

**Back button removed from:** `LikedSongsView`, `PlaylistDetailView`, `AlbumDetailView`. Also check `ArtistView` and remove if present.

**Placement in `PanelShell`:** The back button sits in the `shrink-0` header row. A natural approach is to render it on the left side of the title row, or as a separate slim strip above the title — whichever keeps the header tidy. Exact positioning is an implementation detail.

---

## 4. Toast notification on track add

**Trigger:** After a successful `addToPlaylist` or `addToLikedSongs` call in `TrackContextMenu`'s `PlaylistFlyout`.

**Toast store (`src/store/toast-store.ts`):**

```ts
interface Toast { id: string; message: string; }
interface ToastState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}
```

- `push` appends a new toast with a generated ID.
- `dismiss` removes by ID.
- Auto-dismiss is handled in `ToastContainer` via `setTimeout` (2500ms per toast).

**`ToastContainer` component:**

- Rendered inside `PanelShell`'s fixed header area (or as a fixed-position portal — implementation detail).
- Maps over `toasts`, renders each as a small pill/bar.
- Style: `border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[2px_2px_0_var(--theme-shadow)] text-[9px] text-[var(--color-text-primary)] px-3 py-1.5`.
- On mount of each toast item, schedules `dismiss(id)` after 2500ms.

**Messages:**
- Add to named playlist: `"Added to {playlist.name}"`
- Add to Liked Songs: `"Added to Liked Songs"`

**Calling the store from `PlaylistFlyout`:** Use `useToastStore.getState().push(...)` (outside React render, inside the async handler) before calling `onClose()`.

---

## Scope changes summary

Two new OAuth scopes added to `src/lib/spotify-auth.ts`:

| Scope | Purpose |
|---|---|
| `playlist-read-collaborative` | Read tracks in collaborative playlists by other users |
| `user-read-recently-played` | Fetch recently played history for library sort |

Existing users must log out and back in for new scopes to take effect.

---

## Files affected

| File | Change |
|---|---|
| `src/lib/spotify-auth.ts` | Add 2 scopes |
| `src/store/toast-store.ts` | New file: toast Zustand store |
| `src/components/ToastContainer.tsx` | New file: auto-dismissing toast display |
| `src/components/PanelShell.tsx` | Add back button + render ToastContainer |
| `src/components/TrackContextMenu.tsx` | Call toast store on successful add |
| `src/views/PlaylistDetailView.tsx` | Remove back button; add fetchError state |
| `src/views/LikedSongsView.tsx` | Remove back button |
| `src/views/AlbumDetailView.tsx` | Remove back button |
| `src/views/ArtistView.tsx` | Remove back button if present |
| `src/views/LibraryView.tsx` | Fetch recently-played; sort all three tabs |
