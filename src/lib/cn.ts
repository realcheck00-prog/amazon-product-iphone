type ClassValue = string | number | boolean | null | undefined

/** Minimal class-name joiner — no dependency needed for conditional lists. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}