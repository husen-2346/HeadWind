import React, { useState, useEffect } from "react";
import clsx from "clsx";

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  hint?: string;
  error?: string;
  monoSuffix?: string;
  min?: number;
  max?: number;
}

export function NumberInput({
  value,
  onChange,
  label,
  hint,
  error,
  monoSuffix,
  min,
  max,
  className,
  id,
  disabled,
  ...props
}: NumberInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  // Local display string with commas
  const [displayValue, setDisplayValue] = useState<string>(() =>
    Number.isFinite(value) ? value.toLocaleString("en-US") : ""
  );

  useEffect(() => {
    if (Number.isFinite(value)) {
      setDisplayValue(value.toLocaleString("en-US"));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").trim();
    if (raw === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setDisplayValue(raw); // Let user type digits without jumping cursor
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (Number.isFinite(value)) {
      let clamped = value;
      if (typeof min === "number" && clamped < min) clamped = min;
      if (typeof max === "number" && clamped > max) clamped = max;
      onChange(clamped);
      setDisplayValue(clamped.toLocaleString("en-US"));
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-12 font-medium text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          aria-describedby={errorId || hintId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={clsx(
            "w-full h-10 px-3 bg-surface border border-border rounded-input text-14 text-text font-mono tabular-nums " +
              "placeholder:text-text-muted transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent " +
              "disabled:opacity-50 disabled:cursor-not-allowed",
            monoSuffix && "pr-12",
            error && "border-risk-severe focus-visible:ring-risk-severe",
            className
          )}
          {...props}
        />

        {monoSuffix && (
          <div className="absolute right-3 flex items-center pointer-events-none text-12 font-mono text-text-muted">
            {monoSuffix}
          </div>
        )}
      </div>

      {error && (
        <span id={errorId} className="text-12 text-risk-severe" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={hintId} className="text-12 text-text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}
