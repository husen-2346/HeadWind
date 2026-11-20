import React from "react";
import clsx from "clsx";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "accent" | "subtle" | "outline" | "primary";
  size?: "sm" | "md";
}

export function Pill({
  variant = "subtle",
  size = "md",
  className,
  children,
  ...props
}: PillProps) {
  const variantStyles = {
    accent: "bg-accent/15 text-accent border border-accent/40 font-medium",
    subtle: "bg-surface text-text-muted border border-border",
    outline: "bg-transparent text-text border border-border",
    primary: "bg-accent text-bg font-medium border border-transparent",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-12 rounded-badge",
    md: "px-2.5 py-1 text-12 rounded-badge",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center select-none tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
