import React from "react";
import clsx from "clsx";
import { Info, AlertTriangle, AlertOctagon, RotateCcw } from "./icons";
import { Button } from "./Button";

export interface InlineAlertProps {
  type?: "info" | "warning" | "error";
  title?: string;
  message: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function InlineAlert({
  type = "info",
  title,
  message,
  onRetry,
  className,
}: InlineAlertProps) {
  const styles = {
    info: {
      border: "border-border",
      bg: "bg-surface",
      icon: <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />,
    },
    warning: {
      border: "border-risk-moderate/40",
      bg: "bg-risk-moderate/10",
      icon: <AlertTriangle className="w-4 h-4 text-risk-moderate shrink-0 mt-0.5" />,
    },
    error: {
      border: "border-risk-severe/40",
      bg: "bg-risk-severe/10",
      icon: <AlertOctagon className="w-4 h-4 text-risk-severe shrink-0 mt-0.5" />,
    },
  }[type];

  return (
    <div
      role="alert"
      className={clsx(
        "flex items-start gap-3 p-3 rounded-card border text-14",
        styles.border,
        styles.bg,
        className
      )}
    >
      {styles.icon}
      <div className="flex-1 flex flex-col gap-1 text-left">
        {title && <span className="font-medium text-text">{title}</span>}
        <div className="text-text-muted text-12">{message}</div>
      </div>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          leadingIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="shrink-0 text-12 h-7 px-2"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
