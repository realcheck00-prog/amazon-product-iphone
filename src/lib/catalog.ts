import { price, product } from '@/data/product'
import { primaryProductImage } from '@/data/media'
import { cartItemKey, type CartItem, type NewCartItem } from '@/state/cart'

/**
 * Client-side mirror of the authoritative catalog.
 *
 * The Edge Function holds the real, trusted catalog used for pricing — these
 * values only exist so the UI can render the product before checkout. Never
 * treat a client price as authoritative.
 */
export const PRODUCT_ID = product.asin
export const PRODUCT_TITLE = 'Apple iPhone 17 Pro Max 256 GB'
export const UNIT_PRICE_CENTS = Math.round(price.amount * 100)
export const CURRENCY = 'USD'

export function buildVariantLabel(storageName: string): string {
  return `${storageName} · ${product.color}`
}

export function makeCartItem(
  variant: string,
  unitPriceCents: number = UNIT_PRICE_CENTS,
): NewCartItem {
  return {
    productId: PRODUCT_ID,
    title: PRODUCT_TITLE,
    image: primaryProductImage,
    variant,
    unitPriceCents,
  }
}

/** A fully-formed cart line (with id) used for the direct Buy Now flow. */
export function makeBuyNowItem(
  variant: string,
  unitPriceCents: number,
  quantity: number,
): CartItem {
  return {
    ...makeCartItem(variant, unitPriceCents),
    id: cartItemKey(PRODUCT_ID, variant),
    quantity,
  }
}
