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
        className="glass-panel w-80 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-[10px] text-[var(--color-text-primary)]">{title}</h2>
        <p className="mb-6 text-[8px] text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-[var(--color-border)] px-4 py-1.5 text-[8px] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="border border-[var(--color-border)] bg-red-400 px-4 py-1.5 text-[8px] font-medium text-white shadow-[2px_2px_0_#b91c1c] transition-all hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
