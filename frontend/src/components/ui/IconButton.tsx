import React from "react";
import clsx from "clsx";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "ghost" | "subtle" | "primary";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ "aria-label": ariaLabel, variant = "ghost", size = "md", className, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-input select-none transition-colors " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg " +
      "disabled:opacity-50 disabled:pointer-events-none " +
      "min-h-[44px] min-w-[44px]";

    const variantStyles = {
      primary: "bg-accent text-bg hover:opacity-90 active:opacity-80",
      ghost: "border border-border bg-transparent text-text-muted hover:text-text hover:bg-surface active:bg-surface/80",
      subtle: "bg-transparent text-text-muted hover:text-text hover:bg-surface active:bg-surface/80",
    };

    const sizeStyles = {
      sm: "w-8 h-8 sm:w-8 sm:h-8",
      md: "w-10 h-10 sm:w-10 sm:h-10",
      lg: "w-12 h-12 sm:w-12 sm:h-12",
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
