import React from "react";
import clsx from "clsx";

export interface NumProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function Num({ className, children, ...props }: NumProps) {
  return (
    <span className={clsx("font-mono tabular-nums", className)} {...props}>
      {children}
    </span>
  );
}
