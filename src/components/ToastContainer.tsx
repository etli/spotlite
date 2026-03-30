import { useEffect } from "react";
import { useToastStore } from "../store/toast-store";

function ToastItem({ id, message }: { id: string; message: string }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 2500);
    return () => clearTimeout(timer);
  }, [id, dismiss]);
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[9px] text-[var(--color-text-primary)] shadow-[2px_2px_0_var(--theme-shadow)]">
      {message}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>
  );
}
