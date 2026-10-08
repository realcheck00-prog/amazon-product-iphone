const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const usdWholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `100` -> `$100` */
export function formatUSD(value: number, withDecimals = true): string {
  return withDecimals ? usdFormatter.format(value) : usdWholeFormatter.format(value)
}

/** `100` -> `$100` */
export function formatUSDShort(value: number): string {
  return usdWholeFormatter.format(value)
}

/** `100.5` -> `$100.50` */
export function formatUSDExact(value: number): string {
  return usdFormatter.format(value)
}
