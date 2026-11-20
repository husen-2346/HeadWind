import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export function Card({
  interactive = false,
  selected = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-surface border rounded-card p-3 sm:p-4 transition-colors",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-border",
        interactive &&
          !selected &&
          "hover:border-text-muted/40 cursor-pointer active:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
