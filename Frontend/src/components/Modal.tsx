import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Body */}
      <div
        className={`relative z-10 w-full ${maxWidth} p-6 sm:p-8 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--ink)] shadow-2xl transition-all`}
        role="dialog"
        aria-modal="true"
      >
        {/* Corner close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Optional Icon */}
        {icon && (
          <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--accent)]">
            {icon}
          </div>
        )}

        {/* Title */}
        <h2 className="font-display text-2xl text-center font-normal mb-1 tracking-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs text-center text-[var(--muted)] mb-5">
            {subtitle}
          </p>
        )}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
