import React, { useState, useCallback } from "react";
import clsx from "clsx";
import { CheckCircle, AlertTriangle, AlertOctagon, Info, X } from "./icons";
import { ToastContext, ToastItem, ToastType } from "./ToastContext";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((t) => {
          const icon = {
            info: <Info className="w-4 h-4 text-accent shrink-0" />,
            success: <CheckCircle className="w-4 h-4 text-accent shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-risk-moderate shrink-0" />,
            error: <AlertOctagon className="w-4 h-4 text-risk-severe shrink-0" />,
          }[t.type || "info"];

          return (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto flex items-center justify-between gap-3 p-3 bg-surface border border-border rounded-card shadow-xl text-14 text-text animate-in fade-in slide-in-from-bottom-2 duration-200"
              )}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text p-1 rounded hover:bg-border/50"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
