import React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  monoSuffix?: string;
  leadingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, monoSuffix, leadingIcon, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-12 font-medium text-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={errorId || hintId}
            aria-invalid={Boolean(error)}
            className={clsx(
              "w-full h-10 px-3 bg-surface border border-border rounded-input text-14 text-text " +
                "placeholder:text-text-muted transition-colors " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent " +
                "disabled:opacity-50 disabled:cursor-not-allowed",
              leadingIcon && "pl-9",
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
);

Input.displayName = "Input";
