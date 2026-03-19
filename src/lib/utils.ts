import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format number as 10,000,000 (thousands comma, no decimals) */
export function formatNumberWithCommas(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value
  if (Number.isNaN(n)) return ""
  return Math.round(n).toLocaleString("en-US")
}

/** Parse "10,000,000.00" back to number */
export function parseFormattedNumber(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0
}

/** Restrict input to digits (integer only for display format 10,000,000) */
export function sanitizeNumericInput(s: string): string {
  return s.replace(/[^0-9]/g, "")
}
