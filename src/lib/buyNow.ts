import type { CartItem } from '@/state/cart'

/**
 * "Buy Now" items for a direct-to-checkout flow. Kept separate from the
 * persisted cart so Buy Now never silently mutates what is in the cart.
 * Stored in sessionStorage so a reload of /checkout still shows the item.
 */
const KEY = 'shopfront.buyNow.v1'

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.image === 'string' &&
    typeof item.variant === 'string' &&
    typeof item.unitPriceCents === 'number' &&
    typeof item.quantity === 'number'
  )
}

export function setBuyNowItems(items: CartItem[]): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Ignore storage failures — checkout falls back to the persisted cart.
  }
}

export function getBuyNowItems(): CartItem[] {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

export function clearBuyNowItems(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // no-op
  }
}
