import React from "react";
import clsx from "clsx";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center text-text-muted mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-16 font-medium text-text">{title}</h3>
      {description && (
        <p className="text-14 text-text-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
