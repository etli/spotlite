# Unified Panel UI Design

**Date:** 2026-03-29
**Status:** Approved

## Summary

Replace the current two-panel layout (sidebar + main content area) with a single unified panel. The panel shows either a list view (library tabs) or a detail view (playlist/album/artist), never both simultaneously. A persistent header with the app title and search bar is always visible.

## 1. Layout & Structure

`AppLayout` in `App.tsx` loses the `Sidebar` component entirely. The two-panel flex layout becomes a single `glass-panel` that fills the available space.

**Before:**
```
AppLayout
├── Sidebar
├── <main><Outlet /></main>
└── PlayerBar
```

**After:**
```
AppLayout
├── PanelShell
│   ├── header (title + search bar — always visible)
│   └── <Outlet /> OR <SearchResults> when query is non-empty
└── PlayerBar
```

`Sidebar.tsx` is deleted.

## 2. PanelShell (`src/components/PanelShell.tsx`)

New component that owns search query state and renders the persistent header.

**Header (always visible):**
- `✦ spotlite` title: clicking navigates to `/` and clears any active search query
- Search bar: controlled input. A `×` button appears when non-empty; clicking it clears the query, returning to the active route's content

**Content area logic:**
- When `searchQuery` is empty: renders `<Outlet />`
- When `searchQuery` is non-empty: renders `<SearchResults query={searchQuery} />` in place of the outlet

**Tabs:** Not part of `PanelShell`. They live inside `LibraryView` and only appear on the `/` route.

## 3. LibraryView (`src/views/LibraryView.tsx`)

Three tabs: **Playlists | Albums | Artists**. The `liked` tab is removed.

**Playlists tab:**
- Liked Songs is the first card — visually distinguished with a purple gradient and heart icon
- Clicking Liked Songs navigates to `/liked`
- Remaining playlists follow in the same grid layout as today

**Albums tab:** Unchanged from current implementation.

**Artists tab (new):**
- Fetches `/v1/me/following?type=artist` (Spotify followed artists endpoint)
- Displays as a grid using the existing `AlbumCard` component
- Clicking an artist navigates to the existing `/artist/:id` route

## 4. SearchBar (`src/components/SearchBar.tsx`)

`SearchBar` currently owns its own `value` state. `PanelShell` needs to clear it programmatically (when `✦ spotlite` is clicked or `×` is pressed), so `SearchBar` must become a controlled component: accept `value: string` and `onChange: (value: string) => void` props. The debounce + `onSearch` callback logic stays internal. The `×` clear button is added inside `SearchBar` and calls `onChange("")` when clicked.

`PanelShell` owns `searchQuery` state and passes it as `value` to `SearchBar`.

## 5. SearchResults (`src/views/SearchResults.tsx`)

Rename/refactor `SearchView` → `SearchResults`. Accepts `query: string` as a prop instead of owning its own input state.

- Debounce and API call logic stay the same
- Results render as before
- The `/search` route is removed from `App.tsx`

## 6. LikedSongsView (`src/views/LikedSongsView.tsx`)

New view at route `/liked`. Mirrors `PlaylistDetailView` but:
- Fetches tracks from `/v1/me/tracks` (paginated)
- Header shows "Liked Songs" with a heart icon instead of playlist artwork

## 7. Back Navigation

`PlaylistDetailView`, `AlbumDetailView`, `ArtistView`, and `LikedSongsView` each get a back button at the top of their content.

- Label: `←` (generic)
- Behavior: `history.length <= 1 ? navigate('/') : navigate(-1)`

## 8. Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Remove `Sidebar`, remove `/search` route, add `/liked` route, wrap outlet in `PanelShell` |
| `src/components/Sidebar.tsx` | **Deleted** |
| `src/components/PanelShell.tsx` | **New** |
| `src/views/LibraryView.tsx` | Add Artists tab, merge Liked Songs into Playlists tab, remove Liked tab |
| `src/components/SearchBar.tsx` | Make controlled: add `value` + `onChange` props, add `×` clear button |
| `src/views/SearchView.tsx` | Refactor to accept `query` prop, rename to `SearchResults.tsx` |
| `src/views/LikedSongsView.tsx` | **New** |
| `src/views/PlaylistDetailView.tsx` | Add back button |
| `src/views/AlbumDetailView.tsx` | Add back button |
| `src/views/ArtistView.tsx` | Add back button |

## 9. Out of Scope

- PlayerBar: no changes
- NowPlaying panel: no changes
- DevicePicker: no changes
- Mobile responsiveness: no changes beyond what the single-panel layout naturally provides
- Pagination: Liked Songs and Artists tabs fetch up to 50 items (same limit as existing tabs)
