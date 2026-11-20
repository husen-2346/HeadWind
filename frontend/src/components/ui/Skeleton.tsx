import React from "react";
import clsx from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({
  variant = "text",
  className,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-card",
  };

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "bg-border/60 animate-pulse motion-reduce:animate-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
