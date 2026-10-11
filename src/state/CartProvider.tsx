import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CartContext,
  cartItemKey,
  type CartContextValue,
  type CartItem,
  type NewCartItem,
} from './cart'

const STORAGE_KEY = 'shopfront.cart.v1'
const MAX_QUANTITY = 10

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(value)))
}

/** Defensive parse — a corrupt localStorage entry must not break the app. */
function loadStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry): CartItem[] => {
      if (!entry || typeof entry !== 'object') return []
      const item = entry as Record<string, unknown>
      if (
        typeof item.id !== 'string' ||
        typeof item.productId !== 'string' ||
        typeof item.title !== 'string' ||
        typeof item.image !== 'string' ||
        typeof item.variant !== 'string' ||
        typeof item.unitPriceCents !== 'number' ||
        typeof item.quantity !== 'number'
      ) {
        return []
      }
      return [
        {
          id: item.id,
          productId: item.productId,
          title: item.title,
          image: item.image,
          variant: item.variant,
          unitPriceCents: Math.max(0, Math.round(item.unitPriceCents)),
          quantity: clampQuantity(item.quantity),
        },
      ]
    })
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart)
  const [isOpen, setIsOpen] = useState(false)
  const [cartMessage, setCartMessage] = useState<string | null>(null)
  const messageTimer = useRef<number | null>(null)

  // Persist on every change so the cart survives reloads.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage full / disabled — the in-memory cart still works.
    }
  }, [items])

  useEffect(() => {
    return () => {
      if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
    }
  }, [])

  const announce = useCallback((message: string) => {
    setCartMessage(message)
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setCartMessage(null), 5000)
  }, [])

  const addItem = useCallback(
    (item: NewCartItem, quantity = 1) => {
      const qty = clampQuantity(quantity)
      const id = cartItemKey(item.productId, item.variant)
      setItems((current) => {
        const existing = current.find((line) => line.id === id)
        if (existing) {
          return current.map((line) =>
            line.id === id
              ? { ...line, quantity: clampQuantity(line.quantity + qty) }
              : line,
          )
        }
        return [...current, { ...item, id, quantity: qty }]
      })
      announce(`Added ${qty} × ${item.title} (${item.variant}) to cart`)
    },
    [announce],
  )

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) =>
      current.map((line) =>
        line.id === id ? { ...line, quantity: clampQuantity(quantity) } : line,
      ),
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((line) => line.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(
    () => items.reduce((total, line) => total + line.quantity, 0),
    [items],
  )

  const subtotalCents = useMemo(
    () => items.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0),
    [items],
  )

  const value: CartContextValue = {
    items,
    count,
    subtotalCents,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    setQuantity,
    removeItem,
    clear,
    cartMessage,
    dismissCartMessage: () => setCartMessage(null),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
