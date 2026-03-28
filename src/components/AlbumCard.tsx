import { Link } from "react-router-dom";

interface AlbumCardProps {
  id: string;
  name: string;
  imageUrl: string | undefined;
  subtitle: string;
  linkTo: string;
}

export function AlbumCard({ id, name, imageUrl, subtitle, linkTo }: AlbumCardProps) {
  return (
    <Link to={linkTo} className="group flex flex-col gap-2 rounded-2xl p-3 transition-all hover:bg-white/30">
      <div className="aspect-square overflow-hidden rounded-xl">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="glow h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/20 text-3xl text-[var(--color-text-muted)]">♪</div>
        )}
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{name}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
    </Link>
  );
}
