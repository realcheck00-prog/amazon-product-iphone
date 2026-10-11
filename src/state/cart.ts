import { createContext, useContext } from 'react'

export type CartItem = {
  /** Stable key: `productId::variant`. */
  id: string
  productId: string
  title: string
  image: string
  /** Human-readable selected variant, e.g. `256 GB · Cosmic Orange`. */
  variant: string
  unitPriceCents: number
  quantity: number
}

export type NewCartItem = Omit<CartItem, 'id' | 'quantity'>

export type CartContextValue = {
  items: CartItem[]
  /** Total number of units across all lines. */
  count: number
  subtotalCents: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (item: NewCartItem, quantity?: number) => void
  setQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clear: () => void
  /** Transient confirmation surfaced after an add action. */
  cartMessage: string | null
  dismissCartMessage: () => void
}

export const cartItemKey = (productId: string, variant: string): string =>
  `${productId}::${variant}`

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within <CartProvider>')
  return ctx
}
