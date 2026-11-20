import React from "react";
import clsx from "clsx";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Panel({ header, footer, className, children, ...props }: PanelProps) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-panel flex flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {header && <div className="border-b border-border p-4 shrink-0">{header}</div>}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
      {footer && <div className="border-t border-border p-3 shrink-0">{footer}</div>}
    </div>
  );
}
