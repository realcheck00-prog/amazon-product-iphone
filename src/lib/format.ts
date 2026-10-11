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

const centsFormatters = new Map<string, Intl.NumberFormat>()

/** `10000` -> `$100.00`. All monetary values are stored as integer cents. */
export function formatCents(cents: number, currency = 'USD'): string {
  const key = currency.toUpperCase()
  let formatter = centsFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: key,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    centsFormatters.set(key, formatter)
  }
  return formatter.format(cents / 100)
}
