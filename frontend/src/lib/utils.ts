import { type ClassValue, clsx } from "clsx";

/**
 * Utility for conditionally joining class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
