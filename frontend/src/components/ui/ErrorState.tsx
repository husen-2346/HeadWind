import React from "react";
import clsx from "clsx";
import { AlertOctagon, RotateCcw } from "./icons";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Analysis Failed",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "flex flex-col items-center justify-center p-6 text-center border border-border rounded-panel bg-surface",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-risk-severe/15 text-risk-severe flex items-center justify-center mb-3">
        <AlertOctagon className="w-5 h-5" />
      </div>
      <h3 className="text-16 font-medium text-text">{title}</h3>
      <p className="text-12 text-text-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          leadingIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="mt-4"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
