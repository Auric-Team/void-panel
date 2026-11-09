import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  icon,
  maxWidth = "max-w-lg",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full ${maxWidth} my-auto max-h-[92vh] overflow-y-auto rounded-[10px] bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--ink)] shadow-[0_24px_64px_rgba(0,0,0,0.45)] transition-all`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-hover)] text-[var(--accent)]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  {eyebrow}
                </div>
              )}
              <h2 className="text-base font-semibold tracking-tight text-[var(--ink)] leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-transparent hover:border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
