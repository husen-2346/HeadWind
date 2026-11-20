import React from "react";
import clsx from "clsx";

export interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  className?: string;
}

export function Stat({ label, value, unit, delta, className }: StatProps) {
  return (
    <div className={clsx("flex flex-col text-left select-none", className)}>
      <span className="text-12 font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-20 font-mono font-medium tabular-nums text-text">
          {value}
        </span>
        {unit && (
          <span className="text-12 font-mono text-text-muted">
            {unit}
          </span>
        )}
        {delta && (
          <span className="text-12 font-mono text-text-muted ml-1">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
