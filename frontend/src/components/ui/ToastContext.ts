import { createContext, useContext } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
}

export interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
