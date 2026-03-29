# Track Actions & Library Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-click track context menu (add to playlist, go to artist/album, remove from playlist), save album / follow artist buttons, and full playlist CRUD (create, rename, delete) with confirmation.

**Architecture:** Portal-based floating context menu triggered by right-click on `TrackRow`; a `useTrackContextMenu` hook manages open/close state per view. Library operations (save album, follow artist, add to Liked Songs) all use the unified `PUT/DELETE /me/library` API introduced in Spotify's Feb 2026 update. Modals (`CreatePlaylistModal`, `ConfirmModal`) use portals and are shared across multiple entry points.

**Tech Stack:** React 18 + ReactDOM.createPortal, Zustand, Spotify Web API (Feb 2026), Vitest + @testing-library/react

---

## File Map

**Create:**
- `src/hooks/use-track-context-menu.ts` — hook: state + handlers for context menu open/close
- `src/components/TrackContextMenu.tsx` — portal-rendered floating menu + PlaylistFlyout sub-component
- `src/components/ConfirmModal.tsx` — generic confirmation modal (used for playlist delete)
- `src/components/CreatePlaylistModal.tsx` — create/rename playlist modal (shared via props)
- `src/components/__tests__/TrackContextMenu.test.tsx`
- `src/components/__tests__/ConfirmModal.test.tsx`
- `src/components/__tests__/CreatePlaylistModal.test.tsx`

**Modify:**
- `src/lib/spotify-api.ts` — add `delete` method
- `src/lib/spotify-auth.ts` — add 4 new scopes
- `src/lib/__tests__/spotify-api.test.ts` — add delete test
- `src/store/auth-store.ts` — add `userId` field + `setUserId`
- `src/hooks/use-spotify-auth.ts` — populate `userId` from `/v1/me`
- `src/types/spotify.ts` — remove `followers` from `SpotifyArtist`; add `id` to `SpotifyPlaylist.owner`
- `src/components/TrackRow.tsx` — add optional `onContextMenu` prop
- `src/views/AlbumDetailView.tsx` — save album button + context menu wiring
- `src/views/ArtistView.tsx` — follow artist button + remove followers display + context menu wiring
- `src/views/PlaylistDetailView.tsx` — context menu + rename + delete
- `src/views/LikedSongsView.tsx` — context menu wiring
- `src/views/SearchResults.tsx` — context menu wiring
- `src/views/LibraryView.tsx` — "New Playlist" button

---

## Task 1: Add `delete` method to spotify-api.ts

**Files:**
- Modify: `src/lib/spotify-api.ts`
- Test: `src/lib/__tests__/spotify-api.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/spotify-api.test.ts` inside the `describe` block:

```typescript
it("sends DELETE requests with JSON body", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  await api.delete("/v1/me/library", { uris: ["spotify:album:abc"] });
  expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/library", {
    method: "DELETE",
    headers: { Authorization: "Bearer valid_token", "Content-Type": "application/json" },
    body: JSON.stringify({ uris: ["spotify:album:abc"] }),
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/spotify-api.test.ts
```

Expected: FAIL — `api.delete is not a function`

- [ ] **Step 3: Add `delete` to the returned object in `spotify-api.ts`**

In `src/lib/spotify-api.ts`, add to the returned object (after `post`):

```typescript
delete<T = void>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
  return request<T>("DELETE", path, params, body);
},
```

Also update the type at the bottom — `SpotifyApi` is inferred via `ReturnType`, so no change needed there.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/spotify-api.test.ts
```

Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotify-api.ts src/lib/__tests__/spotify-api.test.ts
git commit -m "feat: add delete method to spotify API client"
```

---

## Task 2: Add OAuth scopes

**Files:**
- Modify: `src/lib/spotify-auth.ts`

- [ ] **Step 1: Add the four new scopes to the `SCOPES` array**

In `src/lib/spotify-auth.ts`, update `SCOPES`:

```typescript
export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-read",
  "user-library-modify",
  "user-follow-read",
  "user-follow-modify",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "streaming",
  "user-read-private",
  "user-read-email",
];
```

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: PASS — no tests cover scopes directly, just confirming nothing broke

- [ ] **Step 3: Commit**

```bash
git add src/lib/spotify-auth.ts
git commit -m "feat: add library-modify, follow-modify, and playlist-modify scopes"
```

> **Note:** Existing logged-in users will need to log out and back in for the new scopes to take effect.

---

## Task 3: Store userId in auth-store; populate from /v1/me

**Files:**
- Modify: `src/store/auth-store.ts`
- Modify: `src/hooks/use-spotify-auth.ts`

- [ ] **Step 1: Add `userId` and `setUserId` to auth-store**

Replace the `AuthState` interface and store implementation in `src/store/auth-store.ts`:

```typescript
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  country: string;
  userId: string | null;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  setCountry: (country: string) => void;
  setUserId: (userId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  country: "US",
  userId: null,

  setTokens: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    set({ accessToken, refreshToken, expiresAt });
    localStorage.setItem("spotlite_access_token", accessToken);
    localStorage.setItem("spotlite_refresh_token", refreshToken);
    localStorage.setItem("spotlite_expires_at", expiresAt.toString());
  },

  setCountry: (country) => set({ country }),

  setUserId: (userId) => set({ userId }),

  logout: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null, userId: null });
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
      set({ accessToken, refreshToken, expiresAt: parseInt(expiresAtStr, 10) });
    }
  },
}));
```

- [ ] **Step 2: Populate userId in use-spotify-auth.ts**

In `src/hooks/use-spotify-auth.ts`, update the `/v1/me` fetch effect (around line 55):

```typescript
// Fetch user profile to get country and userId
useEffect(() => {
  if (!accessToken || !isAuthenticated()) return;
  const api = createSpotifyApi(() => accessToken, () => {});
  api.get<{ country?: string; id?: string }>("/v1/me").then((user) => {
    if (user.country) useAuthStore.getState().setCountry(user.country);
    if (user.id) useAuthStore.getState().setUserId(user.id);
  }).catch(() => {});
}, [accessToken]);
```

- [ ] **Step 3: Run existing tests**

```bash
npm run test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/auth-store.ts src/hooks/use-spotify-auth.ts
git commit -m "feat: store userId in auth store for playlist ownership checks"
```

---

## Task 4: Fix types + remove artist followers display

**Files:**
- Modify: `src/types/spotify.ts`
- Modify: `src/views/ArtistView.tsx`

- [ ] **Step 1: Update SpotifyArtist and SpotifyPlaylist owner in types**

In `src/types/spotify.ts`:

Remove `followers` from `SpotifyArtist`:

```typescript
export interface SpotifyArtist extends SpotifyArtistSimplified {
  images: SpotifyImage[];
  genres: string[];
}
```

Add `id` to `SpotifyPlaylist.owner`:

```typescript
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: { id: string; display_name: string | null };
  items?: { total: number; href: string; items: SpotifyPlaylistItem[] };
  uri: string;
}
```

- [ ] **Step 2: Remove followers display from ArtistView**

In `src/views/ArtistView.tsx`, delete the followers paragraph (around lines 52–54):

```tsx
// Remove this block entirely:
{artist.followers && (
  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{artist.followers.total.toLocaleString()} followers</p>
)}
```

- [ ] **Step 3: Run build to check for type errors**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/types/spotify.ts src/views/ArtistView.tsx
git commit -m "fix: remove followers field (removed in Spotify Feb 2026 API), add owner.id to playlist type"
```

---

## Task 5: Add onContextMenu prop to TrackRow

**Files:**
- Modify: `src/components/TrackRow.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/TrackRow.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrackRow } from "../TrackRow";
import type { SpotifyTrack } from "../../types/spotify";

const track: SpotifyTrack = {
  id: "t1",
  name: "Test Song",
  uri: "spotify:track:t1",
  duration_ms: 180000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
  album: {
    id: "al1", name: "Album", images: [], artists: [],
    release_date: "2024-01-01", total_tracks: 10,
    uri: "spotify:album:al1", album_type: "album",
  },
};

describe("TrackRow", () => {
  it("calls onContextMenu with track and event on right-click", () => {
    const onContextMenu = vi.fn();
    render(<TrackRow track={track} index={0} isPlaying={false} onPlay={vi.fn()} onContextMenu={onContextMenu} />);
    const row = screen.getByRole("button");
    fireEvent.contextMenu(row);
    expect(onContextMenu).toHaveBeenCalledWith(track, expect.any(Object));
  });

  it("does not throw on right-click when onContextMenu is not provided", () => {
    render(<TrackRow track={track} index={0} isPlaying={false} onPlay={vi.fn()} />);
    expect(() => fireEvent.contextMenu(screen.getByRole("button"))).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/TrackRow.test.tsx
```

Expected: FAIL — `onContextMenu` prop not accepted

- [ ] **Step 3: Update TrackRow to accept and wire onContextMenu**

Replace `src/components/TrackRow.tsx`:

```tsx
import type { SpotifyTrack } from "../types/spotify";

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onContextMenu?: (track: SpotifyTrack, e: React.MouseEvent) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, isPlaying, onPlay, onContextMenu }: TrackRowProps) {
  return (
    <button
      onClick={onPlay}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(track, e); } : undefined}
      className={`group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/30 ${
        isPlaying ? "bg-[var(--theme-accent)]/10" : ""
      }`}
    >
      <span className="w-6 text-center text-sm text-[var(--color-text-muted)] group-hover:hidden">{index + 1}</span>
      <span className="hidden w-6 text-center text-sm group-hover:block">▶</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isPlaying ? "font-medium text-[var(--theme-accent)]" : "text-[var(--color-text-primary)]"}`}>{track.name}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{track.artists.map((a) => a.name).join(", ")}</p>
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{formatDuration(track.duration_ms)}</span>
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/__tests__/TrackRow.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TrackRow.tsx src/components/__tests__/TrackRow.test.tsx
git commit -m "feat: add onContextMenu prop to TrackRow"
```

---

## Task 6: ConfirmModal component

**Files:**
- Create: `src/components/ConfirmModal.tsx`
- Create: `src/components/__tests__/ConfirmModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/ConfirmModal.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConfirmModal } from "../ConfirmModal";

describe("ConfirmModal", () => {
  const defaultProps = {
    title: "Delete playlist?",
    message: "This can't be undone.",
    confirmLabel: "Delete",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders title, message, and confirmLabel", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Delete playlist?")).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/ConfirmModal.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create ConfirmModal**

Create `src/components/ConfirmModal.tsx`:

```tsx
import { useEffect } from "react";
import ReactDOM from "react-dom";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-80 rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/__tests__/ConfirmModal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfirmModal.tsx src/components/__tests__/ConfirmModal.test.tsx
git commit -m "feat: add ConfirmModal component"
```

---

## Task 7: CreatePlaylistModal component

**Files:**
- Create: `src/components/CreatePlaylistModal.tsx`
- Create: `src/components/__tests__/CreatePlaylistModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/CreatePlaylistModal.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreatePlaylistModal } from "../CreatePlaylistModal";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    post: vi.fn().mockResolvedValue({ id: "pl1", name: "My Playlist", uri: "spotify:playlist:pl1", description: null, images: [], owner: { id: "u1", display_name: "Me" }, items: undefined }),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

describe("CreatePlaylistModal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders a text input with empty value by default", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("pre-fills the input when initialName is provided", () => {
    render(<CreatePlaylistModal initialName="Road Trip" onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("Road Trip");
  });

  it("shows 'Create' submit label by default", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("shows custom submitLabel when provided", () => {
    render(<CreatePlaylistModal submitLabel="Save" onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("disables submit button when input is empty", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables submit button when input has text", () => {
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Playlist" } });
    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<CreatePlaylistModal onCreated={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/CreatePlaylistModal.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create CreatePlaylistModal**

Create `src/components/CreatePlaylistModal.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import type { SpotifyPlaylist } from "../types/spotify";

interface CreatePlaylistModalProps {
  initialName?: string;
  submitLabel?: string;
  onCreated: (playlist: SpotifyPlaylist) => void;
  onCancel: () => void;
}

export function CreatePlaylistModal({
  initialName = "",
  submitLabel = "Create",
  onCreated,
  onCancel,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState(initialName);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = await api.post<SpotifyPlaylist>("/v1/me/playlists", { name: trimmed, public: false });
    onCreated(playlist);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <form
        className="w-80 rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
          {submitLabel === "Save" ? "Rename playlist" : "New playlist"}
        </h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="mb-6 w-full rounded-xl border border-[var(--color-border)] bg-white/50 px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--theme-accent)]"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-full bg-[var(--theme-accent)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/__tests__/CreatePlaylistModal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CreatePlaylistModal.tsx src/components/__tests__/CreatePlaylistModal.test.tsx
git commit -m "feat: add CreatePlaylistModal component (handles create and rename)"
```

---

## Task 8: useTrackContextMenu hook

**Files:**
- Create: `src/hooks/use-track-context-menu.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-track-context-menu.ts`:

```typescript
import { useState, useCallback } from "react";
import type { SpotifyTrack } from "../types/spotify";

export interface ContextMenuState {
  track: SpotifyTrack;
  x: number;
  y: number;
}

export function useTrackContextMenu(options?: { playlistId?: string }) {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((track: SpotifyTrack, e: React.MouseEvent) => {
    e.preventDefault();
    setMenuState({ track, x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  return {
    menuState,
    handleContextMenu,
    closeMenu,
    playlistId: options?.playlistId,
  };
}
```

- [ ] **Step 2: Run build to verify no type errors**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-track-context-menu.ts
git commit -m "feat: add useTrackContextMenu hook"
```

---

## Task 9: TrackContextMenu component (with PlaylistFlyout)

**Files:**
- Create: `src/components/TrackContextMenu.tsx`
- Create: `src/components/__tests__/TrackContextMenu.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/TrackContextMenu.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TrackContextMenu } from "../TrackContextMenu";
import type { SpotifyTrack } from "../../types/spotify";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0, next: null }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

const track: SpotifyTrack = {
  id: "t1",
  name: "Test Song",
  uri: "spotify:track:t1",
  duration_ms: 180000,
  track_number: 1,
  artists: [{ id: "a1", name: "Artist", uri: "spotify:artist:a1" }],
  album: {
    id: "al1", name: "Album", images: [], artists: [],
    release_date: "2024-01-01", total_tracks: 10,
    uri: "spotify:album:al1", album_type: "album",
  },
};

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <TrackContextMenu track={track} x={100} y={100} onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe("TrackContextMenu", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders Add to playlist, Go to artist, Go to album items", () => {
    renderMenu();
    expect(screen.getByText("Add to playlist")).toBeInTheDocument();
    expect(screen.getByText("Go to artist")).toBeInTheDocument();
    expect(screen.getByText("Go to album")).toBeInTheDocument();
  });

  it("does not render Remove from playlist when playlistId is not set", () => {
    renderMenu();
    expect(screen.queryByText("Remove from playlist")).not.toBeInTheDocument();
  });

  it("renders Remove from playlist when playlistId is provided", () => {
    renderMenu({ playlistId: "pl1", onRemoveTrack: vi.fn() });
    expect(screen.getByText("Remove from playlist")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/__tests__/TrackContextMenu.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create TrackContextMenu with PlaylistFlyout**

Create `src/components/TrackContextMenu.tsx`:

```tsx
import { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import type { SpotifyTrack, SpotifyPlaylist, SpotifyPaginated } from "../types/spotify";

interface TrackContextMenuProps {
  track: SpotifyTrack;
  x: number;
  y: number;
  onClose: () => void;
  playlistId?: string;
  onRemoveTrack?: () => void;
}

function PlaylistFlyout({
  track,
  onClose,
  onCreatePlaylist,
}: {
  track: SpotifyTrack;
  onClose: () => void;
  onCreatePlaylist: () => void;
}) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
      .then((data) => setPlaylists(data.items.filter(Boolean)))
      .catch(() => {});
  }, [api]);

  const addToPlaylist = async (playlistId: string) => {
    await api.post(`/v1/playlists/${playlistId}/items`, { uris: [track.uri] });
    onClose();
  };

  const addToLikedSongs = async () => {
    await api.put("/v1/me/library", { uris: [track.uri] });
    onClose();
  };

  return (
    <div className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-white/40 bg-white/90 py-1 shadow-2xl backdrop-blur-md">
      <button
        onClick={addToLikedSongs}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
      >
        <span>💜</span> Liked Songs
      </button>
      {playlists.map((pl) => (
        <button
          key={pl.id}
          onClick={() => addToPlaylist(pl.id)}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          <span>🎵</span>
          <span className="truncate">{pl.name}</span>
        </button>
      ))}
      <div className="my-1 border-t border-white/30" />
      <button
        onClick={onCreatePlaylist}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--theme-accent)] hover:bg-white/50"
      >
        <span>＋</span> New playlist
      </button>
    </div>
  );
}

export function TrackContextMenu({
  track,
  x,
  y,
  onClose,
  playlistId,
  onRemoveTrack,
}: TrackContextMenuProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Clamp position to viewport
  const clampedX = Math.min(x, window.innerWidth - 200);
  const clampedY = Math.min(y, window.innerHeight - 200);

  const handleGoToArtist = () => {
    navigate(`/artist/${track.artists[0].id}`);
    onClose();
  };

  const handleGoToAlbum = () => {
    navigate(`/album/${track.album.id}`);
    onClose();
  };

  const handleRemove = async () => {
    if (!playlistId) return;
    await api.delete(`/v1/playlists/${playlistId}/items`, { uris: [track.uri] });
    onRemoveTrack?.();
    onClose();
  };

  const handleCreatePlaylistModal = () => {
    setFlyoutOpen(false);
    setShowCreateModal(true);
  };

  const handlePlaylistCreated = async (playlist: SpotifyPlaylist) => {
    await api.post(`/v1/playlists/${playlist.id}/items`, { uris: [track.uri] });
    setShowCreateModal(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <>
      <div
        ref={menuRef}
        style={{ position: "fixed", left: clampedX, top: clampedY, zIndex: 9999 }}
        className="w-48 rounded-xl border border-white/40 bg-white/90 py-1 shadow-2xl backdrop-blur-md"
      >
        {/* Add to playlist */}
        <div
          className="relative"
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          <button className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50">
            Add to playlist <span className="text-xs text-[var(--color-text-muted)]">▶</span>
          </button>
          {flyoutOpen && (
            <PlaylistFlyout
              track={track}
              onClose={onClose}
              onCreatePlaylist={handleCreatePlaylistModal}
            />
          )}
        </div>

        <div className="my-1 border-t border-white/30" />

        <button
          onClick={handleGoToArtist}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          Go to artist
        </button>
        <button
          onClick={handleGoToAlbum}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/50"
        >
          Go to album
        </button>

        {playlistId && (
          <>
            <div className="my-1 border-t border-white/30" />
            <button
              onClick={handleRemove}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-500 hover:bg-white/50"
            >
              Remove from playlist
            </button>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          onCreated={handlePlaylistCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>,
    document.body
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/__tests__/TrackContextMenu.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TrackContextMenu.tsx src/components/__tests__/TrackContextMenu.test.tsx
git commit -m "feat: add TrackContextMenu with PlaylistFlyout"
```

---

## Task 10: Save album button in AlbumDetailView + context menu

**Files:**
- Modify: `src/views/AlbumDetailView.tsx`

- [ ] **Step 1: Update AlbumDetailView**

Replace `src/views/AlbumDetailView.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyAlbumFull } from "../types/spotify";

export function AlbumDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [album, setAlbum] = useState<SpotifyAlbumFull | null>(null);
  const [saved, setSaved] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyAlbumFull>(`/v1/albums/${id}`).then((data) => {
      setAlbum(data);
      api.get<boolean[]>("/v1/me/library/contains", { uris: data.uri })
        .then((results) => setSaved(results[0] ?? false))
        .catch(() => {});
    }).catch(() => {});
  }, [id, api]);

  if (!album) return null;

  const playAlbum = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: album.uri };
    if (trackUri) body.offset = { uri: trackUri };
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", body, params);
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await api.put("/v1/me/library", { uris: [album.uri] });
      } else {
        await api.delete("/v1/me/library", { uris: [album.uri] });
      }
    } catch {
      setSaved(!next);
    }
  };

  const imageUrl = album.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ← Back
      </button>
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={album.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{album.album_type}</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{album.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {album.artists.map((a) => (<Link key={a.id} to={`/artist/${a.id}`} className="hover:underline">{a.name}</Link>))}
            {" · "}{album.release_date.split("-")[0]}{" · "}{album.total_tracks} tracks
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => playAlbum()}
              className="w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
            >
              ▶ Play
            </button>
            <button
              onClick={toggleSave}
              className="w-fit rounded-full border border-[var(--theme-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
            >
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {album.tracks.items.map((track, i) => (
          <TrackRow
            key={track.id}
            track={{ ...track, album }}
            index={i}
            isPlaying={currentTrack?.id === track.id}
            onPlay={() => playAlbum(track.uri)}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {menuState && (
        <TrackContextMenu
          track={menuState.track}
          x={menuState.x}
          y={menuState.y}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/views/AlbumDetailView.tsx
git commit -m "feat: add save album button and track context menu to AlbumDetailView"
```

---

## Task 11: Follow artist button in ArtistView + context menu

**Files:**
- Modify: `src/views/ArtistView.tsx`

- [ ] **Step 1: Update ArtistView**

Replace `src/views/ArtistView.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyArtist, SpotifyAlbumSimplified, SpotifyPaginated } from "../types/spotify";

export function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [following, setFollowing] = useState(false);
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyArtist>(`/v1/artists/${id}`).then((data) => {
      setArtist(data);
      api.get<boolean[]>("/v1/me/library/contains", { uris: data.uri })
        .then((results) => setFollowing(results[0] ?? false))
        .catch(() => {});
    }).catch(() => {});
    const market = useAuthStore.getState().country;
    api.get<SpotifyPaginated<SpotifyAlbumSimplified>>(`/v1/artists/${id}/albums`, {
      include_groups: "album,single,compilation", market,
    }).then((data) => setAlbums(data.items)).catch(() => {});
  }, [id, api]);

  if (!artist) return null;

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await api.put("/v1/me/library", { uris: [artist.uri] });
      } else {
        await api.delete("/v1/me/library", { uris: [artist.uri] });
      }
    } catch {
      setFollowing(!next);
    }
  };

  const imageUrl = artist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-8">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ← Back
      </button>
      <div className="flex items-end gap-6">
        {imageUrl && <img src={imageUrl} alt={artist.name} className="glow h-48 w-48 shrink-0 rounded-full object-cover" />}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">{artist.name}</h1>
          <button
            onClick={toggleFollow}
            className="w-fit rounded-full border border-[var(--theme-accent)] px-4 py-1.5 text-sm font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
          >
            {following ? "Following ✓" : "Follow"}
          </button>
        </div>
      </div>
      {albums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Discography</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
                subtitle={`${album.release_date.split("-")[0]} · ${album.album_type}`} linkTo={`/album/${album.id}`} />
            ))}
          </div>
        </section>
      )}
      {menuState && (
        <TrackContextMenu
          track={menuState.track}
          x={menuState.x}
          y={menuState.y}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/views/ArtistView.tsx
git commit -m "feat: add follow artist button and track context menu to ArtistView"
```

---

## Task 12: Playlist rename, delete, and context menu in PlaylistDetailView

**Files:**
- Modify: `src/views/PlaylistDetailView.tsx`

- [ ] **Step 1: Update PlaylistDetailView**

Replace `src/views/PlaylistDetailView.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { ConfirmModal } from "../components/ConfirmModal";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyPlaylist, SpotifyPlaylistItem, SpotifyPaginated } from "../types/spotify";

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyPlaylistItem[]>([]);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const userId = useAuthStore((s) => s.userId);
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu({ playlistId: id });

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    if (!id) return;
    api.get<SpotifyPlaylist>(`/v1/playlists/${id}`).then(setPlaylist).catch(() => {});
    api.get<SpotifyPaginated<SpotifyPlaylistItem>>(`/v1/playlists/${id}/items`)
      .then((data) => setTracks(data.items.filter((item) => item.item != null))).catch(() => {});
  }, [id, api]);

  if (!playlist) return null;

  const isOwned = playlist.owner.id === userId;

  const playPlaylist = async (trackUri?: string) => {
    const body: Record<string, unknown> = { context_uri: playlist.uri };
    if (trackUri) body.offset = { uri: trackUri };
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", body, params);
  };

  const handleRemoveTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((item) => item.item?.id !== trackId));
  };

  const handleDelete = async () => {
    await api.delete("/v1/me/library", { uris: [playlist.uri] });
    navigate("/");
  };

  const imageUrl = playlist.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ← Back
      </button>
      <div className="flex gap-6">
        {imageUrl && <img src={imageUrl} alt={playlist.name} className="glow h-48 w-48 shrink-0 rounded-2xl object-cover" />}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{playlist.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{playlist.owner?.display_name} · {playlist.items?.total ?? tracks.length} tracks</p>
          {playlist.description && <p className="text-xs text-[var(--color-text-muted)]">{playlist.description}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => playPlaylist()}
              className="w-fit rounded-full bg-[var(--theme-accent)] px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105"
            >
              ▶ Play
            </button>
            {isOwned && (
              <>
                <button
                  onClick={() => setShowRename(true)}
                  className="w-fit rounded-full border border-[var(--theme-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-accent)] transition-all hover:bg-[var(--theme-accent)]/10"
                >
                  Rename
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-fit rounded-full border border-red-400 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
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

      {menuState && (
        <TrackContextMenu
          track={menuState.track}
          x={menuState.x}
          y={menuState.y}
          onClose={closeMenu}
          playlistId={id}
          onRemoveTrack={() => handleRemoveTrack(menuState.track.id)}
        />
      )}

      {showRename && (
        <RenameModal
          playlist={playlist}
          api={api}
          onRenamed={(name) => {
            setPlaylist((prev) => prev ? { ...prev, name } : prev);
            setShowRename(false);
          }}
          onCancel={() => setShowRename(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={`Delete "${playlist.name}"?`}
          message="This will remove the playlist from your library. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// Rename uses PUT /playlists/{id} rather than POST /me/playlists,
// so we can't reuse CreatePlaylistModal directly. This is a thin wrapper
// that shares the same visual structure.
function RenameModal({
  playlist,
  api,
  onRenamed,
  onCancel,
}: {
  playlist: SpotifyPlaylist;
  api: ReturnType<typeof createSpotifyApi>;
  onRenamed: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(playlist.name);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await api.put(`/v1/playlists/${playlist.id}`, { name: trimmed });
    onRenamed(trimmed);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <form
        className="w-80 rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">Rename playlist</h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="mb-6 w-full rounded-xl border border-[var(--color-border)] bg-white/50 px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--theme-accent)]"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-full bg-[var(--theme-accent)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
```

Note: `RenameModal` uses `ReactDOM.createPortal` — add `import ReactDOM from "react-dom";` at the top.

- [ ] **Step 2: Add missing import**

The full import block at the top of `PlaylistDetailView.tsx` should be:

```tsx
import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { ConfirmModal } from "../components/ConfirmModal";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyPlaylist, SpotifyPlaylistItem, SpotifyPaginated } from "../types/spotify";
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/views/PlaylistDetailView.tsx
git commit -m "feat: add context menu, rename, and delete to PlaylistDetailView"
```

---

## Task 13: Wire context menu into LikedSongsView

**Files:**
- Modify: `src/views/LikedSongsView.tsx`

- [ ] **Step 1: Update LikedSongsView**

Replace `src/views/LikedSongsView.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
import type { SpotifyTrack, SpotifyPaginated } from "../types/spotify";

export function LikedSongsView() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const navigate = useNavigate();
  const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();

  const api = useMemo(
    () => createSpotifyApi(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().logout(),
    ),
    []
  );

  useEffect(() => {
    api.get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", { limit: "50" })
      .then((data) => setTracks(data.items.map((i) => i.track)))
      .catch(() => {});
  }, [api]);

  const goBack = () => {
    if (window.history.length <= 1) navigate("/");
    else navigate(-1);
  };

  const playTrack = async (uri: string) => {
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", { uris: [uri] }, params);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        ← Back
      </button>
      <div className="flex gap-6">
        <div className="glow flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 text-5xl">
          💜
        </div>
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Playlist</p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Liked Songs</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tracks.length} tracks</p>
        </div>
      </div>
      <div className="flex flex-col">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            isPlaying={currentTrack?.id === track.id}
            onPlay={() => playTrack(track.uri)}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {menuState && (
        <TrackContextMenu
          track={menuState.track}
          x={menuState.x}
          y={menuState.y}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/views/LikedSongsView.tsx
git commit -m "feat: add track context menu to LikedSongsView"
```

---

## Task 14: Wire context menu into SearchResults

**Files:**
- Modify: `src/views/SearchResults.tsx`

- [ ] **Step 1: Add context menu wiring to SearchResults**

Add imports after the existing imports:

```tsx
import { TrackContextMenu } from "../components/TrackContextMenu";
import { useTrackContextMenu } from "../hooks/use-track-context-menu";
```

Add the hook call inside the `SearchResults` function, after the existing hooks:

```tsx
const { menuState, handleContextMenu, closeMenu } = useTrackContextMenu();
```

Pass `onContextMenu` to each `TrackRow` (in the tracks section):

```tsx
<TrackRow
  key={track.id}
  track={track}
  index={i}
  isPlaying={currentTrack?.id === track.id}
  onPlay={() => playTrack(track.uri)}
  onContextMenu={handleContextMenu}
/>
```

Add the context menu render at the bottom of the returned JSX, before the closing `</div>`:

```tsx
{menuState && (
  <TrackContextMenu
    track={menuState.track}
    x={menuState.x}
    y={menuState.y}
    onClose={closeMenu}
  />
)}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/views/SearchResults.tsx
git commit -m "feat: add track context menu to SearchResults"
```

---

## Task 15: New Playlist button in LibraryView

**Files:**
- Modify: `src/views/LibraryView.tsx`

- [ ] **Step 1: Add Create Playlist button and modal to LibraryView**

Add imports at the top of `src/views/LibraryView.tsx`:

```tsx
import { CreatePlaylistModal } from "../components/CreatePlaylistModal";
```

Add state inside the component:

```tsx
const [showCreateModal, setShowCreateModal] = useState(false);
```

Replace the tabs row to add the `+ New` button:

```tsx
<div className="mb-6 flex items-center gap-2">
  {tabs.map((tab) => (
    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
      className={`rounded-full px-4 py-1.5 text-sm transition-all ${
        activeTab === tab.key
          ? "bg-[var(--theme-accent)] text-white shadow-md"
          : "bg-white/30 text-[var(--color-text-secondary)] hover:bg-white/50"
      }`}>{tab.label}</button>
  ))}
  {activeTab === "playlists" && (
    <button
      onClick={() => setShowCreateModal(true)}
      className="ml-auto rounded-full bg-white/30 px-4 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:bg-white/50"
    >
      + New
    </button>
  )}
</div>
```

Add the modal and its handler before the closing `</div>` of the component:

```tsx
{showCreateModal && (
  <CreatePlaylistModal
    onCreated={(playlist) => {
      setPlaylists((prev) => [playlist, ...prev]);
      setShowCreateModal(false);
    }}
    onCancel={() => setShowCreateModal(false)}
  />
)}
```

- [ ] **Step 2: Run build and tests**

```bash
npm run build && npm run test
```

Expected: no errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/views/LibraryView.tsx
git commit -m "feat: add New Playlist button to LibraryView"
```

---

## Final verification

- [ ] **Run the full test suite**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Run the dev server and manually verify each feature**

```bash
npm run dev
```

Check:
1. Right-click any track → context menu appears with correct items
2. "Add to playlist" → flyout shows playlists + Liked Songs + New playlist
3. On a playlist you own → Rename and Delete buttons appear; on others → hidden
4. Album page → Save/Saved ✓ button toggles
5. Artist page → Follow/Following ✓ button toggles; no followers count shown
6. Library → "+ New" button creates a playlist and it appears at top
7. Delete playlist → confirmation modal → navigates home
8. Rename playlist → modal pre-filled → name updates in header
