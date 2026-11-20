import React, { useRef } from "react";
import clsx from "clsx";

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  name: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string | number>({
  name,
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }

    if (nextIndex !== currentIndex) {
      const nextOption = options[nextIndex];
      onChange(nextOption.value);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>("button[role='radio']");
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel || name}
      className={clsx(
        "inline-flex p-1 bg-surface border border-border rounded-input gap-1 select-none",
        className
      )}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            aria-label={opt.ariaLabel}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={clsx(
              "px-3 py-1.5 text-12 font-mono font-medium rounded-input transition-colors " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
                "min-h-[36px] flex items-center justify-center",
              isSelected
                ? "bg-bg text-accent border border-accent"
                : "text-text-muted hover:text-text hover:bg-bg/40 border border-transparent"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
