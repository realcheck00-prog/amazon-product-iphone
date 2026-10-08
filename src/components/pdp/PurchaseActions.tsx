import { Check, X } from 'lucide-react'
import { usePdp } from '@/state/pdp'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/**
 * Add to Cart + Buy Now pair rendered directly below the product gallery on
 * mobile and tablet (`lg:hidden`). On desktop the same actions live in the
 * sticky buy box.
 */
export function PurchaseActions({ className }: { className?: string }) {
  const { totalPrice, addToCart, cartMessage, dismissCartMessage } = usePdp()
  const canBuy = totalPrice !== null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-3">
        <Button
          block
          size="md"
          className="min-h-11 px-3 py-3 text-sm sm:px-6 sm:text-base"
          disabled={!canBuy}
          onClick={addToCart}
        >
          Add to Cart
        </Button>
        <Button
          block
          size="md"
          variant="accent"
          className="min-h-11 px-3 py-3 text-sm sm:px-6 sm:text-base"
          disabled={!canBuy}
          onClick={addToCart}
        >
          Buy Now
        </Button>
      </div>

      {cartMessage && (
        <p
          role="status"
          className="animate-fade-in flex items-start gap-1.5 rounded-md bg-[#e7f5f1] px-2.5 py-2 text-xs text-success"
        >
          <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{cartMessage}</span>
          <button
            type="button"
            onClick={dismissCartMessage}
            aria-label="Dismiss"
            className="shrink-0 text-success/70 hover:text-success"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </p>
      )}
    </div>
  )
}
