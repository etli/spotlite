# Unified Panel UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-panel layout (sidebar + main) with a single `PanelShell` that shows either the library list view or a detail view, never both simultaneously, with a persistent title and search bar.

**Architecture:** `PanelShell` is a new component that owns search query state, renders a persistent header (title + search bar), and conditionally shows `<Outlet />` or `<SearchResults>` in the content area below. `App.tsx` wires `PanelShell` as the sole content container, removing `Sidebar`. The `/search` route is removed; search is always reachable from the panel header.

**Tech Stack:** React 19, React Router 7, Zustand, Vitest, React Testing Library, jsdom

---

## File Map

| File | Action |
|------|--------|
| `src/test-setup.ts` | Create — jest-dom matchers setup |
| `src/components/SearchBar.tsx` | Modify — controlled input + clear button, remove debounce |
| `src/components/PanelShell.tsx` | Create — persistent header + search state + Outlet |
| `src/views/SearchResults.tsx` | Create — renamed/refactored from SearchView; accepts `query` prop with internal debounce |
| `src/views/LikedSongsView.tsx` | Create — liked songs detail view at `/liked` |
| `src/views/LibraryView.tsx` | Modify — add Artists tab, add Liked Songs card, remove Liked Songs tab |
| `src/views/PlaylistDetailView.tsx` | Modify — add back button |
| `src/views/AlbumDetailView.tsx` | Modify — add back button |
| `src/views/ArtistView.tsx` | Modify — add back button |
| `src/App.tsx` | Modify — remove Sidebar, wrap with PanelShell, add `/liked`, remove `/search` |
| `src/components/Sidebar.tsx` | Delete |
| `src/views/SearchView.tsx` | Delete |
| `vite.config.ts` | Modify — add setupFiles |
| `src/components/__tests__/SearchBar.test.tsx` | Create |
| `src/components/__tests__/PanelShell.test.tsx` | Create |
| `src/views/__tests__/SearchResults.test.tsx` | Create |
| `src/views/__tests__/LikedSongsView.test.tsx` | Create |
| `src/views/__tests__/LibraryView.test.tsx` | Create |

---

### Task 1: Test infrastructure

**Files:**
- Create: `src/test-setup.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create test setup file**

```ts
// src/test-setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 2: Add setupFiles to vite.config.ts**

In `vite.config.ts`, change:
```ts
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
```
to:
```ts
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm run test`
Expected: all existing tests pass

- [ ] **Step 4: Commit**

```bash
git add src/test-setup.ts vite.config.ts
git commit -m "test: add jest-dom setup for component tests"
```

---

### Task 2: Refactor SearchBar into a controlled input

`SearchBar` currently owns its own value state and debounce. It needs to become a simple controlled input with a clear button. The debounce moves to `SearchResults` (Task 3).

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Create: `src/components/__tests__/SearchBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/SearchBar.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
  it("renders with the controlled value", () => {
    render(<SearchBar value="hello" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("hello");
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    expect(onChange).toHaveBeenCalledWith("jazz");
  });

  it("shows the clear button when value is non-empty", () => {
    render(<SearchBar value="jazz" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
  });

  it("hides the clear button when value is empty", () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onChange with empty string when the clear button is clicked", () => {
    const onChange = vi.fn();
    render(<SearchBar value="jazz" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/components/__tests__/SearchBar.test.tsx`
Expected: FAIL — `onChange` prop does not exist on current SearchBar

- [ ] **Step 3: Replace SearchBar implementation**

```tsx
// src/components/SearchBar.tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for songs, albums, or artists..."
        className="w-full rounded-2xl border border-white/30 bg-white/40 px-5 py-3 pr-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] backdrop-blur-sm transition-all focus:border-[var(--theme-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/20"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/components/__tests__/SearchBar.test.tsx`
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/__tests__/SearchBar.test.tsx
git commit -m "refactor: make SearchBar a controlled input with clear button"
```

---

### Task 3: Create SearchResults (replaces SearchView)

`SearchView` used `SearchBar` internally and owned its own query state. `SearchResults` accepts `query` as a prop and handles debounce internally before calling the API.

**Files:**
- Create: `src/views/SearchResults.tsx`
- Create: `src/views/__tests__/SearchResults.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/views/__tests__/SearchResults.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchResults } from "../SearchResults";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({}),
    put: vi.fn(),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

vi.mock("../../store/player-store", () => ({
  usePlayerStore: Object.assign(
    (selector: (s: { currentTrack: null }) => unknown) => selector({ currentTrack: null }),
    { getState: () => ({ activeDeviceId: null }) }
  ),
}));

describe("SearchResults", () => {
  it("shows empty state when query is empty", () => {
    render(<MemoryRouter><SearchResults query="" /></MemoryRouter>);
    expect(screen.getByText("Search for your favorite music")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npx vitest run src/views/__tests__/SearchResults.test.tsx`
Expected: FAIL — `SearchResults` not found

- [ ] **Step 3: Create SearchResults**

```tsx
// src/views/SearchResults.tsx
import { useState, useEffect } from "react";
import { AlbumCard } from "../components/AlbumCard";
import { TrackRow } from "../components/TrackRow";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import type { SpotifySearchResult } from "../types/spotify";

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<SpotifySearchResult | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<SpotifySearchResult>("/v1/search", {
          q: query.trim(),
          type: "track,album,artist",
        });
        setResults(data);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const playTrack = async (uri: string) => {
    const deviceId = usePlayerStore.getState().activeDeviceId;
    const params = deviceId ? { device_id: deviceId } : undefined;
    await api.put("/v1/me/player/play", { uris: [uri] }, params);
  };

  return (
    <div className="flex flex-col gap-6">
      {results?.tracks && results.tracks.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Tracks</h2>
          <div className="flex flex-col">
            {results.tracks.items.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} isPlaying={currentTrack?.id === track.id}
                onPlay={() => playTrack(track.uri)} />
            ))}
          </div>
        </section>
      )}
      {results?.albums && results.albums.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Albums</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.albums.items.map((album) => (
              <AlbumCard key={album.id} id={album.id} name={album.name} imageUrl={album.images?.[0]?.url}
                subtitle={album.artists.map((a) => a.name).join(", ")} linkTo={`/album/${album.id}`} />
            ))}
          </div>
        </section>
      )}
      {results?.artists && results.artists.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-[var(--color-text-primary)]">Artists</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.artists.items.map((artist) => (
              <AlbumCard key={artist.id} id={artist.id} name={artist.name} imageUrl={artist.images?.[0]?.url}
                subtitle={`${(artist.followers?.total ?? 0).toLocaleString()} followers`} linkTo={`/artist/${artist.id}`} />
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

- [ ] **Step 4: Run test to confirm it passes**

Run: `npx vitest run src/views/__tests__/SearchResults.test.tsx`
Expected: 1 test passes

- [ ] **Step 5: Commit**

```bash
git add src/views/SearchResults.tsx src/views/__tests__/SearchResults.test.tsx
git commit -m "feat: add SearchResults component accepting query prop"
```

---

### Task 4: Create LikedSongsView

New view at `/liked` that fetches liked tracks and shows them like a playlist.

**Files:**
- Create: `src/views/LikedSongsView.tsx`
- Create: `src/views/__tests__/LikedSongsView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/views/__tests__/LikedSongsView.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LikedSongsView } from "../LikedSongsView";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0, next: null }),
    put: vi.fn(),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

vi.mock("../../store/player-store", () => ({
  usePlayerStore: Object.assign(
    (selector: (s: { currentTrack: null }) => unknown) => selector({ currentTrack: null }),
    { getState: () => ({ activeDeviceId: null }) }
  ),
}));

describe("LikedSongsView", () => {
  it("renders the Liked Songs heading", () => {
    render(<MemoryRouter><LikedSongsView /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Liked Songs" })).toBeInTheDocument();
  });

  it("renders a back button", () => {
    render(<MemoryRouter><LikedSongsView /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/views/__tests__/LikedSongsView.test.tsx`
Expected: FAIL — `LikedSongsView` not found

- [ ] **Step 3: Create LikedSongsView**

```tsx
// src/views/LikedSongsView.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { usePlayerStore } from "../store/player-store";
import { TrackRow } from "../components/TrackRow";
import type { SpotifyTrack, SpotifyPaginated } from "../types/spotify";

export function LikedSongsView() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const navigate = useNavigate();

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    api.get<SpotifyPaginated<{ track: SpotifyTrack }>>("/v1/me/tracks", { limit: "50" })
      .then((data) => setTracks(data.items.map((i) => i.track)))
      .catch(() => {});
  }, []);

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
        ←
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
          <TrackRow key={track.id} track={track} index={i} isPlaying={currentTrack?.id === track.id}
            onPlay={() => playTrack(track.uri)} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/views/__tests__/LikedSongsView.test.tsx`
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/views/LikedSongsView.tsx src/views/__tests__/LikedSongsView.test.tsx
git commit -m "feat: add LikedSongsView at /liked route"
```

---

### Task 5: Upgrade LibraryView

Add Artists tab (fetches followed artists), add Liked Songs card as first item in Playlists tab, remove Liked Songs tab and all associated state.

**Files:**
- Modify: `src/views/LibraryView.tsx`
- Create: `src/views/__tests__/LibraryView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/views/__tests__/LibraryView.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LibraryView } from "../LibraryView";

vi.mock("../../lib/spotify-api", () => ({
  createSpotifyApi: () => ({
    get: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0, next: null }),
    put: vi.fn(),
  }),
}));

vi.mock("../../store/auth-store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "token", logout: vi.fn() }) },
}));

vi.mock("../../store/player-store", () => ({
  usePlayerStore: Object.assign(
    (selector: (s: { currentTrack: null }) => unknown) => selector({ currentTrack: null }),
    { getState: () => ({ activeDeviceId: null }) }
  ),
}));

describe("LibraryView", () => {
  it("renders Playlists, Albums, and Artists tabs", () => {
    render(<MemoryRouter><LibraryView /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Playlists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Albums" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artists" })).toBeInTheDocument();
  });

  it("does not render a Liked Songs tab button", () => {
    render(<MemoryRouter><LibraryView /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Liked Songs" })).not.toBeInTheDocument();
  });

  it("shows the Liked Songs card in the Playlists tab", () => {
    render(<MemoryRouter><LibraryView /></MemoryRouter>);
    expect(screen.getByText("Liked Songs")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/views/__tests__/LibraryView.test.tsx`
Expected: FAIL — Artists tab not found, Liked Songs tab still present

- [ ] **Step 3: Replace LibraryView**

```tsx
// src/views/LibraryView.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createSpotifyApi } from "../lib/spotify-api";
import { useAuthStore } from "../store/auth-store";
import { AlbumCard } from "../components/AlbumCard";
import type { SpotifyPlaylist, SpotifyAlbumSimplified, SpotifyArtist, SpotifyPaginated } from "../types/spotify";

type Tab = "playlists" | "albums" | "artists";

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbumSimplified[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);

  const api = createSpotifyApi(
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().logout(),
  );

  useEffect(() => {
    if (activeTab === "playlists") {
      api.get<SpotifyPaginated<SpotifyPlaylist>>("/v1/me/playlists", { limit: "50" })
        .then((data) => setPlaylists(data.items.filter((pl) => pl != null))).catch(() => {});
    } else if (activeTab === "albums") {
      api.get<SpotifyPaginated<{ album: SpotifyAlbumSimplified }>>("/v1/me/albums", { limit: "50" })
        .then((data) => setAlbums(data.items.map((i) => i.album))).catch(() => {});
    } else if (activeTab === "artists") {
      api.get<{ artists: SpotifyPaginated<SpotifyArtist> }>("/v1/me/following", { type: "artist", limit: "50" })
        .then((data) => setArtists(data.artists.items)).catch(() => {});
    }
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "playlists", label: "Playlists" },
    { key: "albums", label: "Albums" },
    { key: "artists", label: "Artists" },
  ];

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-all ${
              activeTab === tab.key
                ? "bg-[var(--theme-accent)] text-white shadow-md"
                : "bg-white/30 text-[var(--color-text-secondary)] hover:bg-white/50"
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "playlists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Link to="/liked" className="group flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 p-3 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg">
            <div className="flex aspect-square items-center justify-center rounded-xl text-4xl">💜</div>
            <div className="px-1">
              <p className="truncate text-sm font-medium text-white">Liked Songs</p>
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
              subtitle={`${(artist.followers?.total ?? 0).toLocaleString()} followers`} linkTo={`/artist/${artist.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/views/__tests__/LibraryView.test.tsx`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/views/LibraryView.tsx src/views/__tests__/LibraryView.test.tsx
git commit -m "feat: add Artists tab and Liked Songs card to LibraryView"
```

---

### Task 6: Create PanelShell

The persistent shell around all route content. Owns search state and decides whether to show `<Outlet />` or `<SearchResults>`.

**Files:**
- Create: `src/components/PanelShell.tsx`
- Create: `src/components/__tests__/PanelShell.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/PanelShell.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PanelShell } from "../PanelShell";

vi.mock("../../views/SearchResults", () => ({
  SearchResults: ({ query }: { query: string }) => <div>Results for {query}</div>,
}));

function renderPanelShell(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PanelShell />}>
          <Route path="/" element={<div>Home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("PanelShell", () => {
  it("renders the spotlite title", () => {
    renderPanelShell();
    expect(screen.getByText(/spotlite/i)).toBeInTheDocument();
  });

  it("renders a search input", () => {
    renderPanelShell();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the outlet when the search query is empty", () => {
    renderPanelShell();
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("shows SearchResults when the user types a query", () => {
    renderPanelShell();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    expect(screen.getByText("Results for jazz")).toBeInTheDocument();
    expect(screen.queryByText("Home content")).not.toBeInTheDocument();
  });

  it("restores the outlet when the search query is cleared", () => {
    renderPanelShell();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "jazz" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(screen.getByText("Home content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/components/__tests__/PanelShell.test.tsx`
Expected: FAIL — `PanelShell` not found

- [ ] **Step 3: Create PanelShell**

```tsx
// src/components/PanelShell.tsx
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "../views/SearchResults";

export function PanelShell() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleTitleClick = () => {
    setSearchQuery("");
    navigate("/");
  };

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          onClick={handleTitleClick}
          className="text-lg font-light tracking-widest text-[var(--color-text-primary)] transition-opacity hover:opacity-70"
        >
          ✦ spotlite
        </button>
      </div>
      <div className="shrink-0 px-4 pb-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {searchQuery ? <SearchResults query={searchQuery} /> : <Outlet />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/components/__tests__/PanelShell.test.tsx`
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/PanelShell.tsx src/components/__tests__/PanelShell.test.tsx
git commit -m "feat: add PanelShell with persistent search and title"
```

---

### Task 7: Wire App.tsx, add back buttons, delete old files

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/views/PlaylistDetailView.tsx`
- Modify: `src/views/AlbumDetailView.tsx`
- Modify: `src/views/ArtistView.tsx`
- Delete: `src/components/Sidebar.tsx`
- Delete: `src/views/SearchView.tsx`

- [ ] **Step 1: Add back button to PlaylistDetailView**

In `src/views/PlaylistDetailView.tsx`, add `useNavigate` to the import:
```tsx
import { useParams, useNavigate } from "react-router-dom";
```

Add `navigate` and `goBack` inside the component, after the existing `useParams` line:
```tsx
const navigate = useNavigate();
const goBack = () => {
  if (window.history.length <= 1) navigate("/");
  else navigate(-1);
};
```

Add the back button as the first element inside the returned `<div className="flex flex-col gap-6">`:
```tsx
<button
  onClick={goBack}
  aria-label="Go back"
  className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
>
  ←
</button>
```

- [ ] **Step 2: Add back button to AlbumDetailView**

In `src/views/AlbumDetailView.tsx`, add `useNavigate` to the import:
```tsx
import { useParams, useNavigate, Link } from "react-router-dom";
```

Add inside the component, after the existing `useParams` line:
```tsx
const navigate = useNavigate();
const goBack = () => {
  if (window.history.length <= 1) navigate("/");
  else navigate(-1);
};
```

Add as the first element inside the returned `<div className="flex flex-col gap-6">`:
```tsx
<button
  onClick={goBack}
  aria-label="Go back"
  className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
>
  ←
</button>
```

- [ ] **Step 3: Add back button to ArtistView**

In `src/views/ArtistView.tsx`, add `useNavigate` to the import:
```tsx
import { useParams, useNavigate } from "react-router-dom";
```

Add inside the component, after the existing `useParams` line:
```tsx
const navigate = useNavigate();
const goBack = () => {
  if (window.history.length <= 1) navigate("/");
  else navigate(-1);
};
```

Add as the first element inside the returned `<div className="flex flex-col gap-8">`:
```tsx
<button
  onClick={goBack}
  aria-label="Go back"
  className="flex w-fit items-center text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
>
  ←
</button>
```

- [ ] **Step 4: Replace App.tsx**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useSpotifyAuth } from "./hooks/use-spotify-auth";
import { usePlayback } from "./hooks/use-playback";
import { useTheme } from "./hooks/use-theme";
import { useDevices } from "./hooks/use-devices";
import { PanelShell } from "./components/PanelShell";
import { PlayerBar } from "./components/PlayerBar";
import { MiniPlayer } from "./components/MiniPlayer";
import { NowPlaying } from "./components/NowPlaying";
import { DevicePicker } from "./components/DevicePicker";
import { LoginView } from "./views/LoginView";
import { LibraryView } from "./views/LibraryView";
import { LikedSongsView } from "./views/LikedSongsView";
import { PlaylistDetailView } from "./views/PlaylistDetailView";
import { AlbumDetailView } from "./views/AlbumDetailView";
import { ArtistView } from "./views/ArtistView";
import { usePlayerStore } from "./store/player-store";
import { useRemotePolling } from "./hooks/use-remote-polling";

function AppLayout({ playback }: { playback: ReturnType<typeof usePlayback> }) {
  const [showDevices, setShowDevices] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { devices, transferPlayback } = useDevices();
  const activeDeviceId = usePlayerStore((s) => s.activeDeviceId);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden p-2 pb-0">
        <PanelShell />
      </div>
      {showNowPlaying && (
        <NowPlaying playback={playback} onClose={() => setShowNowPlaying(false)} />
      )}
      <div className="relative">
        {showDevices && (
          <div className="absolute bottom-full right-4">
            <DevicePicker
              devices={devices}
              activeDeviceId={activeDeviceId}
              onSelectDevice={(id, name) => { transferPlayback(id, name); setShowDevices(false); }}
              onClose={() => setShowDevices(false)}
            />
          </div>
        )}
        <PlayerBar
          playback={playback}
          onToggleMode={() => {}}
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
  useRemotePolling();

  if (!isAuthenticated) {
    return <LoginView onLogin={login} />;
  }

  if (miniMode) {
    return <MiniPlayer playback={playback} onToggleMode={() => setMiniMode(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout playback={playback} />}>
          <Route path="/" element={<LibraryView />} />
          <Route path="/liked" element={<LikedSongsView />} />
          <Route path="/playlist/:id" element={<PlaylistDetailView />} />
          <Route path="/album/:id" element={<AlbumDetailView />} />
          <Route path="/artist/:id" element={<ArtistView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Delete Sidebar and SearchView**

```bash
rm src/components/Sidebar.tsx src/views/SearchView.tsx
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all tests pass

- [ ] **Step 7: Run the type checker**

Run: `npm run build`
Expected: no TypeScript errors

- [ ] **Step 8: Verify in browser**

Run: `npm run dev` and open http://127.0.0.1:5173

Check:
- Single panel fills the screen, no sidebar
- `✦ spotlite` title in top left — clicking it returns to Playlists tab
- Playlists tab shows Liked Songs card first, then playlists grid
- Albums tab shows saved albums
- Artists tab shows followed artists
- Clicking any item opens its detail view
- Detail views have a `←` back button that returns to the previous view
- Typing in search bar shows live results; `×` clears it and restores the previous view

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/views/PlaylistDetailView.tsx src/views/AlbumDetailView.tsx src/views/ArtistView.tsx
git commit -m "feat: unified single-panel layout with PanelShell and back navigation"
```
