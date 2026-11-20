import React, { useState, useRef, useEffect, useId } from "react";
import clsx from "clsx";
import { Search, Loader2, X, Check } from "./icons";
import { IconButton } from "./IconButton";

export interface ComboboxOption<T = unknown> {
  value: string;
  label: string;
  subLabel?: string;
  data?: T;
}

export interface ComboboxProps<T = unknown> {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectOption: (option: ComboboxOption<T>) => void;
  options: ComboboxOption<T>[];
  loading?: boolean;
  error?: string;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

export function Combobox<T = unknown>({
  id: customId,
  label,
  placeholder,
  value,
  onChange,
  onSelectOption,
  options,
  loading = false,
  error,
  onClear,
  className,
  disabled = false,
}: ComboboxProps<T>) {
  const generatedId = useId();
  const baseId = customId || generatedId;
  const listboxId = `${baseId}-listbox`;
  const errorId = error ? `${baseId}-error` : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(options.length > 0 ? 0 : -1);
      } else {
        setActiveIndex((prev) => (options.length > 0 ? (prev + 1) % options.length : -1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(options.length > 0 ? options.length - 1 : -1);
      } else {
        setActiveIndex((prev) => (options.length > 0 ? (prev - 1 + options.length) % options.length : -1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        const selected = options[activeIndex];
        onSelectOption(selected);
        setIsOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const handleSelect = (option: ComboboxOption<T>) => {
    onSelectOption(option);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && options[activeIndex]
      ? `${baseId}-option-${activeIndex}`
      : undefined;

  return (
    <div ref={containerRef} className={clsx("relative w-full flex flex-col gap-1 text-left", className)}>
      {label && (
        <label htmlFor={baseId} className="text-12 font-medium text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          id={baseId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (options.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={clsx(
            "w-full h-10 pl-9 pr-9 bg-surface border border-border rounded-input text-14 text-text " +
              "placeholder:text-text-muted transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent " +
              "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-risk-severe focus-visible:ring-risk-severe"
          )}
        />

        {value && !disabled && (
          <div className="absolute right-1.5 flex items-center">
            <IconButton
              type="button"
              aria-label="Clear location input"
              variant="subtle"
              size="sm"
              onClick={() => {
                onClear?.();
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="text-text-muted hover:text-text h-7 w-7"
            >
              <X className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        )}
      </div>

      {error && (
        <span id={errorId} className="text-12 text-risk-severe" role="alert">
          {error}
        </span>
      )}

      {/* Dropdown suggestions listbox */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label || "Location suggestions"}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-surface border border-border rounded-panel py-1 shadow-none backdrop-blur-md"
        >
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-12 text-text-muted flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              Searching locations...
            </li>
          )}

          {!loading && options.length === 0 && value.trim().length >= 2 && (
            <li className="px-3 py-2 text-12 text-text-muted">No matching locations found</li>
          )}

          {options.map((opt, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <li
                key={opt.value + idx}
                id={`${baseId}-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={clsx(
                  "px-3 py-2 text-14 cursor-pointer flex items-center justify-between transition-colors",
                  isSelected ? "bg-border/60 text-text" : "text-text-muted hover:text-text hover:bg-border/30"
                )}
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-text">{opt.label}</span>
                  {opt.subLabel && <span className="text-12 text-text-muted">{opt.subLabel}</span>}
                </div>
                {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
