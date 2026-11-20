import React from "react";
import clsx from "clsx";
import { Loader2 } from "./icons";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "subtle";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leadingIcon,
      trailingIcon,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles =
      "inline-flex items-center justify-center font-medium select-none transition-colors " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg " +
      "disabled:opacity-50 disabled:pointer-events-none " +
      "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0";

    const variantStyles = {
      primary:
        "bg-accent text-bg hover:opacity-90 active:opacity-80 rounded-input shadow-none",
      ghost:
        "border border-border bg-transparent text-text hover:bg-surface active:bg-surface/80 rounded-input",
      subtle:
        "bg-transparent text-text-muted hover:text-text hover:bg-surface active:bg-surface/80 rounded-input",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-12 gap-1.5",
      md: "h-10 px-4 text-14 gap-2",
      lg: "h-12 px-5 text-16 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          leadingIcon
        )}
        {children}
        {!loading && trailingIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
