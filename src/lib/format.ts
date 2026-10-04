const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `142490` -> `₹1,42,490.00` (Indian digit grouping). */
export function formatINR(value: number, withDecimals = true): string {
  return withDecimals ? inrFormatter.format(value) : inrWholeFormatter.format(value)
}

/** `4274` -> `₹4,274` */
export function formatINRShort(value: number): string {
  return inrWholeFormatter.format(value)
}

/** `6416.16` -> `₹6,416.16` */
export function formatINRExact(value: number): string {
  return inrFormatter.format(value)
}