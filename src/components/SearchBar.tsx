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
