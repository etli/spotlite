interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-12 shadow-[2px_2px_0_var(--theme-shadow)]">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[18px] text-[var(--color-text-primary)]"><span aria-hidden="true">✦ </span>spotlite</h1>
          <p className="text-[8px] text-[var(--color-text-secondary)]">your music, simplified</p>
        </div>
        <button
          onClick={onLogin}
          className="border border-[var(--color-border)] bg-[var(--theme-accent)] px-8 py-3 text-[9px] font-medium text-white shadow-[2px_2px_0_var(--theme-shadow)] transition-all hover:scale-105 hover:shadow-[3px_3px_0_var(--theme-shadow)]"
        >
          Connect with Spotify
        </button>
        <p className="max-w-xs text-center text-[7px] text-[var(--color-text-muted)]">
          Requires Spotify Premium. We only access your library and playback.
        </p>
      </div>
    </div>
  );
}
