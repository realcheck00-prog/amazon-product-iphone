import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useCart } from '@/state/cart'
import { clearBuyNowItems } from '@/lib/buyNow'
import { formatCents } from '@/lib/format'
import { Button } from '@/components/ui/Button'

/**
 * Slide-over cart. Opening it is the "clear way to open the cart and proceed
 * to checkout" required after Add to Cart.
 */
export function CartDrawer() {
  const { items, count, subtotalCents, isOpen, closeCart, setQuantity, removeItem } = useCart()
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, closeCart])

  if (!isOpen) return null

  function goToCheckout() {
    // A cart checkout should never carry over a stale Buy Now selection.
    clearBuyNowItems()
    closeCart()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="animate-fade-in relative flex h-full w-full max-w-md flex-col bg-surface shadow-raised"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ShoppingCart className="size-5" aria-hidden />
            Your Cart
            {count > 0 && <span className="text-sm font-normal text-ink-3">({count})</span>}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-muted hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingCart className="size-10 text-ink-4" aria-hidden />
              <p className="text-sm font-medium text-ink">Your cart is empty</p>
              <p className="max-w-xs text-xs text-ink-3">
                Add the iPhone Pro Max to your cart to continue to checkout.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 border-b border-line-soft pb-4 last:border-b-0">
                  <img
                    src={item.image}
                    alt=""
                    className="size-20 shrink-0 rounded-md border border-line-soft bg-surface object-contain p-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{item.variant}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {formatCents(item.unitPriceCents)}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border border-line">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.title}`}
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          className="flex size-8 items-center justify-center text-ink-2 hover:bg-surface-muted"
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="tnum w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.title}`}
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          className="flex size-8 items-center justify-center text-ink-2 hover:bg-surface-muted"
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="link flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="space-y-3 border-t border-line px-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">Subtotal ({count} item{count === 1 ? '' : 's'})</span>
              <span className="tnum font-semibold text-ink">{formatCents(subtotalCents)}</span>
            </div>
            <Button block size="lg" variant="primary" onClick={goToCheckout}>
              Proceed to Checkout
            </Button>
          </footer>
        )}
      </div>
    </div>
  )
}
