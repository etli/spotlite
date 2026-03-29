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
import { PlaylistDetailView } from "./views/PlaylistDetailView";
import { AlbumDetailView } from "./views/AlbumDetailView";
import { ArtistView } from "./views/ArtistView";
import { usePlayerStore } from "./store/player-store";
import { useRemotePolling } from "./hooks/use-remote-polling";

function AppLayout({ playback }: { playback: ReturnType<typeof usePlayback> }) {
  const [sidebarCollapsed, _setSidebarCollapsed] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { devices, transferPlayback } = useDevices();
  const activeDeviceId = usePlayerStore((s) => s.activeDeviceId);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 gap-2 overflow-hidden p-2 pb-0">
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
        <main className="glass-panel flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
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
          <Route path="/playlist/:id" element={<PlaylistDetailView />} />
          <Route path="/album/:id" element={<AlbumDetailView />} />
          <Route path="/artist/:id" element={<ArtistView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
