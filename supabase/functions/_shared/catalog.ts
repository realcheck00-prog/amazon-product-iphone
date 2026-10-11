/**
 * Authoritative server-side catalog.
 *
 * Unit prices live ONLY here. The browser never dictates price, totals or
 * product details — the Edge Functions look everything up from this map.
 */
export type CatalogEntry = {
  title: string
  image: string
  unitPriceCents: number
}

export const CURRENCY = 'USD'
export const MAX_LINE_QUANTITY = 10

export const CATALOG: Record<string, CatalogEntry> = {
  // Apple iPhone 17 Pro Max 256 GB — $100.00 = 10000 cents.
  B0FQFNQ5LX: {
    title: 'Apple iPhone 17 Pro Max 256 GB',
    image: '/images/1.png',
    unitPriceCents: 10000,
  },
}
