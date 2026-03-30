import { Link } from "react-router-dom";

interface AlbumCardProps {
  id: string;
  name: string;
  imageUrl: string | undefined;
  subtitle: string;
  linkTo: string;
  onClick?: () => void;
}

export function AlbumCard({ name, imageUrl, subtitle, linkTo, onClick }: AlbumCardProps) {
  return (
    <Link
      to={linkTo}
      onClick={onClick}
      className="group flex flex-col gap-2 border border-transparent p-3 transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-[2px_2px_0_var(--theme-shadow)]"
    >
      <div className="aspect-square overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-3xl text-[var(--color-text-muted)]">♪</div>
        )}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-[9px] font-medium text-[var(--color-text-primary)]">{name}</p>
        <p className="mt-0.5 truncate text-[7px] text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
    </Link>
  );
}
