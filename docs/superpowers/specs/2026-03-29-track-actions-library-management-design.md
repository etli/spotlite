# Track Actions & Library Management

**Date:** 2026-03-29

## Overview

Six new feature areas:

1. Right-click context menu on any track row
2. Save album button on album pages
3. Follow artist button on artist pages
4. Create new playlists; remove tracks from playlists
5. Rename playlist (modal, owned playlists only)
6. Delete playlist with confirmation modal (owned playlists only)

Plus a bug fix: remove the now-missing `followers` field from artist objects (removed in Spotify's Feb 2026 API update).

---

## API Foundations

### New `delete` method on `spotify-api.ts`

Add `delete(path, body?, params?)` alongside `get`, `put`, `post`. Must support sending a JSON body — `DELETE /me/library` requires `{ uris: [...] }`.

### New OAuth scopes in `spotify-auth.ts`

Add to `SCOPES`:

- `user-library-modify` — save/unsave albums and tracks
- `user-follow-modify` — follow/unfollow artists
- `playlist-modify-public` — add/remove/create public playlists
- `playlist-modify-private` — add/remove/create private playlists

Users will need to re-login once after this change.

### Feb 2026 API endpoints in use

| Action | Endpoint |
|---|---|
| Save/follow any entity | `PUT /me/library` `{ uris: ["spotify:album:id"] }` |
| Unsave/unfollow any entity | `DELETE /me/library` `{ uris: ["spotify:album:id"] }` |
| Check saved/following status | `GET /me/library/contains?uris=spotify:album:id` |
| Add track to playlist | `POST /playlists/{id}/items` `{ uris: ["spotify:track:id"] }` |
| Remove track from playlist | `DELETE /playlists/{id}/items` `{ uris: ["spotify:track:id"] }` |
| Create playlist | `POST /me/playlists` `{ name: string, public: false }` |

Note: `POST /users/{user_id}/playlists` was removed in Feb 2026 — `POST /me/playlists` is the replacement and does not require a user ID.

### Type fixes

- Remove `followers?: { total: number }` from `SpotifyArtist` in `src/types/spotify.ts` — field was removed from the Spotify API in Feb 2026.
- Add `id: string` to `SpotifyPlaylist.owner` — needed to compare against the logged-in user's ID to determine playlist ownership.

### Auth store additions

- Add `userId: string | null` to `auth-store.ts`, populated in `use-spotify-auth.ts` alongside `country` from the existing `/v1/me` call (the `SpotifyUser` type already has `id`).

---

## Feature 1: Track Context Menu

### Interaction

Right-clicking any `TrackRow` opens a floating context menu at cursor position. Clicking outside or pressing Escape closes it. No visible button — the row itself is the trigger.

### Components

**`useTrackContextMenu(options?: { playlistId?: string })`** — hook, lives in `src/hooks/`

- State: `{ track: SpotifyTrack, x: number, y: number } | null`
- Returns `handleContextMenu(track, e)` (pass to each `TrackRow`) and `menuState` + `closeMenu`
- `playlistId` controls whether "Remove from playlist" is shown

**`TrackContextMenu`** — component, lives in `src/components/`

- Rendered via `ReactDOM.createPortal` into `document.body`
- Props: `track`, `x`, `y`, `onClose`, `playlistId?`
- Absolutely positioned at `{ x, y }`, clamped to viewport edges
- Click-outside handler via `useEffect` + `mousedown` listener
- Escape key handler via `useEffect` + `keydown` listener

**Menu items (in order):**

1. **Add to playlist** — hover/click opens `PlaylistFlyout` (see below)
2. **Go to artist** — `navigate(/artist/{track.artists[0].id})`, close menu
3. **Go to album** — `navigate(/album/{track.album.id})`, close menu
4. **Remove from playlist** — only rendered when `playlistId` is set; calls `DELETE /playlists/{playlistId}/items` with `{ uris: [track.uri] }`, then removes the track from local state in the parent view, closes menu

**`PlaylistFlyout`** — sub-component of `TrackContextMenu`

- Opens on hover/click of "Add to playlist" item
- On open, fetches `GET /me/playlists?limit=50`
- List: Liked Songs (💜, always first) → user playlists → "+ New playlist" at bottom
- Clicking Liked Songs: `PUT /me/library { uris: [track.uri] }`, close menu (no confirmation needed — operation is instant)
- Clicking a playlist: `POST /playlists/{id}/items { uris: [track.uri] }`, close menu
- Clicking "+ New playlist": opens `CreatePlaylistModal` (see Feature 4); on creation, immediately adds the track to the new playlist

### `TrackRow` changes

Add optional prop `onContextMenu?: (track: SpotifyTrack, e: React.MouseEvent) => void`. When present, call it on `contextmenu` event and call `e.preventDefault()` to suppress the browser's native menu.

### View wiring

Each view that uses `TrackRow` instantiates `useTrackContextMenu` and:
- Passes `handleContextMenu` to each `TrackRow`
- Renders `<TrackContextMenu>` when `menuState` is non-null
- `PlaylistDetailView` passes `playlistId` to the hook

Views affected: `AlbumDetailView`, `PlaylistDetailView`, `LikedSongsView`, `SearchResults`.

---

## Feature 2: Save Album

### Location

`AlbumDetailView` — button rendered next to the existing Play button.

### Behavior

- On mount, `GET /me/library/contains?uris={album.uri}` → returns `[true]` or `[false]`; read index 0
- Button label: "Save" (unsaved) / "Saved ✓" (saved)
- Styled as a ghost/outline button — secondary to Play
- Click: optimistic state flip, then `PUT /me/library { uris: [album.uri] }` or `DELETE /me/library { uris: [album.uri] }`
- On API error: revert state

---

## Feature 3: Follow Artist

### Location

`ArtistView` — button rendered inline in the artist header, next to the artist name.

### Behavior

- Same pattern as Save Album: `GET /me/library/contains?uris={artist.uri}` on mount → read index 0
- Button label: "Follow" / "Following ✓"
- Ghost/outline style
- Optimistic toggle with error revert
- Remove the existing `{artist.followers.total.toLocaleString()} followers` line from the view (field no longer returned by API)

---

## Feature 4: Create Playlist

### `CreatePlaylistModal` component (`src/components/`)

- Centered modal overlay with backdrop
- Single text input: playlist name (required, trimmed)
- Create button (disabled when input empty) + Cancel button
- On submit: `POST /me/playlists { name, public: false }`
- Returns the new playlist object to the caller via `onCreated(playlist)` callback
- Closes on Cancel, Escape, or successful creation

### Entry point 1: Library playlists tab

- Add a small `+ New` button to the right of the tab pills in `LibraryView`
- Only visible when `activeTab === "playlists"`
- On `onCreated`: prepend new playlist to the `playlists` state array

### Entry point 2: PlaylistFlyout "+ New playlist"

- Clicking opens `CreatePlaylistModal`
- On `onCreated`: immediately call `POST /playlists/{newPlaylist.id}/items { uris: [track.uri] }`, then show "Added to [name]" confirmation and close the context menu

---

## Feature 5: Rename Playlist

### Location

`PlaylistDetailView` — shown only when `playlist.owner.id === useAuthStore.getState().userId`.

### Behavior

- A "Rename" button in the playlist header (alongside Play)
- Opens a modal (reuses the same modal pattern as `CreatePlaylistModal` but pre-filled with the current name, with a "Save" button instead of "Create")
- On submit: `PUT /playlists/{id}` `{ name }` — requires `playlist-modify-public` or `playlist-modify-private` (already in scope)
- On success: update `playlist.name` in local state, close modal

### Component

Rename shares the same modal structure as Create. Rather than a separate component, `CreatePlaylistModal` accepts an optional `initialName` prop and a `submitLabel` prop (defaults to "Create", override to "Save") to serve both purposes.

---

## Feature 6: Delete Playlist

### Location

`PlaylistDetailView` — shown only when `playlist.owner.id === useAuthStore.getState().userId`.

### Behavior

- A "Delete" button in the playlist header
- Opens a confirmation modal: "Delete [playlist name]? This can't be undone." with "Delete" (destructive style) + "Cancel"
- On confirm: `DELETE /me/library { uris: [playlist.uri] }` (unfollow/remove from library — Spotify has no hard-delete, unfollowing an owned playlist removes it from your library)
- On success: navigate to `/` (library view)

### Component

A simple `ConfirmModal` component: `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`. Reusable for other destructive actions in the future.

---

## Out of scope

- Reordering tracks
- Playlist cover images
- Multi-select track operations
- Renaming/deleting playlists you don't own
- "Go to album" when already on the album page (still shown — navigating to the same route is harmless)
