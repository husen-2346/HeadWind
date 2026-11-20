import React from "react";
import clsx from "clsx";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Surface({ elevated = false, className, children, ...props }: SurfaceProps) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-panel",
        elevated && "border-text-muted/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
