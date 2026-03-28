interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-8 rounded-3xl border border-white/30 bg-white/40 p-12 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-light tracking-wider text-gray-700">spotlite</h1>
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
