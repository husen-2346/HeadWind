import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-input transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:opacity-50 disabled:pointer-events-none",
          {
            // Primary cyan button
            "bg-accent text-bg hover:opacity-90 active:opacity-80": variant === "primary",
            // Ghost outline button
            "border border-border bg-transparent text-text hover:bg-surface active:bg-surface":
              variant === "ghost",
          },
          {
            "text-12 px-3 py-1.5": size === "sm",
            "text-14 px-4 py-2": size === "md",
            "text-16 px-5 py-2.5": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
