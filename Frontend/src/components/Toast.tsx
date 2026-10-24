import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "error";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (title: string, type?: ToastType, description?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, type: ToastType = "success", description?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Region fixed at bottom center / right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-md border shadow-lg backdrop-blur-md transition-all duration-normal ${
              t.type === "success"
                ? "bg-[var(--surface-solid)] border-[var(--success-border)] text-[var(--ink)]"
                : t.type === "info"
                ? "bg-[var(--surface-solid)] border-[var(--info-border)] text-[var(--ink)]"
                : t.type === "warning"
                ? "bg-[var(--surface-solid)] border-[var(--warning-border)] text-[var(--ink)]"
                : "bg-[var(--surface-solid)] border-[var(--danger-border)] text-[var(--ink)]"
            }`}
          >
            {/* Status Dot / Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {t.type === "success" && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
              {t.type === "info" && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
              {t.type === "warning" && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              )}
              {t.type === "error" && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-red-500/20 text-red-600 dark:text-red-400">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <strong className="block text-xs font-medium leading-none mb-1">
                {t.title}
              </strong>
              {t.description && (
                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  {t.description}
                </p>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => removeToast(t.id)}
              className="text-[var(--muted)] hover:text-[var(--ink)] p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
