import React from "react";
import clsx from "clsx";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement | HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export function Divider({
  orientation = "horizontal",
  label,
  className,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={clsx("w-px self-stretch bg-border", className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={clsx("relative flex items-center w-full my-2 select-none", className)}
        {...props}
      >
        <div className="flex-grow border-t border-border" />
        <span className="flex-shrink mx-3 text-12 font-mono uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <div className="flex-grow border-t border-border" />
      </div>
    );
  }

  return (
    <hr
      className={clsx("w-full border-0 border-t border-border my-2", className)}
      {...props}
    />
  );
}
