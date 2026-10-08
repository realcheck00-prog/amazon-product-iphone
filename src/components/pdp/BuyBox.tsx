import { useEffect } from 'react'
import {
  Check,
  ChevronDown,
  Gift,
  Heart,
  Lock,
  MapPin,
  PackageCheck,
  Store,
  Truck,
  X,
  Zap,
} from 'lucide-react'
import { fulfilment, product, storefront } from '@/data/product'
import { formatUSD } from '@/lib/format'
import { usePdp } from '@/state/pdp'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'

export function BuyBox() {
  const {
    quantity,
    setQuantity,
    totalPrice,
    storage,
    addToCart,
    wishlisted,
    toggleWishlist,
    cartMessage,
    dismissCartMessage,
  } = usePdp()

  const canBuy = totalPrice !== null

  useEffect(() => {
    if (!cartMessage) return
    const t = window.setTimeout(dismissCartMessage, 4000)
    return () => window.clearTimeout(t)
  }, [cartMessage, dismissCartMessage])

  return (
    <aside className="panel p-4 lg:sticky lg:top-[calc(2rem+3.5rem+2.75rem)]">
      {/* Price + savings */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="tnum text-price font-semibold text-price">
            {canBuy ? formatUSD(totalPrice) : '—'}
          </span>
          <span className="text-xs text-ink-3">Inclusive of all taxes</span>
        </div>
        {canBuy && (
          <p className="tnum text-xs text-ink-3">
            Subtotal <span className="font-semibold text-ink">{formatUSD(totalPrice)}</span>
          </p>
        )}

        <div className="rounded-md border border-line-soft bg-surface-sunken p-2.5">
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-2">
            <Truck className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
            <span>
              <span className="font-semibold text-ink">FREE delivery</span> Tuesday, 6 October.{' '}
              <span className="link link-underline">Details</span>
            </span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-ink-2">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
            <span>
              Or fastest delivery <span className="font-semibold text-ink">Tomorrow, 5 October</span>
              . <span className="link link-underline">Details</span>
            </span>
          </p>
          <p className="mt-2 flex items-center gap-1.5 border-t border-line-soft pt-2 text-xs text-ink-2">
            <MapPin className="size-3.5 shrink-0 text-ink-3" aria-hidden />
            Delivering to {storefront.deliverToCity} {storefront.deliverToPostalCode} —{' '}
            <button type="button" className="link link-underline">
              Update location
            </button>
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-base font-medium text-ink">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          In stock
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="buybox-qty">
            Quantity
          </label>
          <div className="relative">
            <select
              id="buybox-qty"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="appearance-none rounded-md border border-line bg-surface py-1.5 pr-8 pl-2.5 text-sm text-ink focus:border-ink-3 focus:outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Qty: {n}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
          </div>
          <Chip tone="neutral">
            {product.storage} · {product.color}
          </Chip>
        </div>

        {/*
          Below `lg` the purchase buttons live directly under the product
          gallery (see <PurchaseActions />), so they are desktop-only here.
        */}
        <div className="hidden space-y-2 pt-1 lg:block">
          <Button block size="lg" disabled={!canBuy} onClick={addToCart}>
            Add to Cart
          </Button>
          <Button block size="lg" variant="accent" disabled={!canBuy} onClick={addToCart}>
            Buy Now
          </Button>
        </div>

        {cartMessage && (
          <p
            role="status"
            className="animate-fade-in hidden items-start gap-1.5 rounded-md bg-[#e7f5f1] px-2.5 py-2 text-xs text-success lg:flex"
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

        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={wishlisted}
          className="flex w-full items-center justify-center gap-2 rounded-pill py-2 text-sm text-link hover:bg-surface-sunken"
        >
          <Heart
            className={cn('size-4', wishlisted && 'fill-deal text-deal')}
            aria-hidden
          />
          {wishlisted ? 'Added to Wish List' : 'Add to Wish List'}
        </button>
      </div>

      {/* Fulfilment facts */}
      <dl className="mt-4 space-y-2.5 border-t border-line-soft pt-3.5 text-xs">
        <div className="flex items-start gap-2">
          <PackageCheck className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <div>
            <dt className="text-ink-3">Ships from</dt>
            <dd className="font-medium text-ink">{fulfilment.shipsFrom}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Store className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <div>
            <dt className="text-ink-3">Sold by</dt>
            <dd className="font-medium text-ink">{fulfilment.soldBy}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <div>
            <dt className="text-ink-3">Payment</dt>
            <dd className="leading-relaxed text-ink-2">
              <span className="font-medium text-ink">Secure transaction</span> — your transaction
              is secure. Our payment security system encrypts your information during
              transmission. We don’t share your credit card details with third-party sellers, and we
              don’t sell your information to others.{' '}
              <span className="link link-underline">Learn more</span>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Gift className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <div>
            <dt className="text-ink-3">Gift options</dt>
            <dd className="leading-relaxed text-ink-2">
              {fulfilment.giftOptions.detail}.{' '}
              <span className="link link-underline">{fulfilment.giftOptions.cta}</span>
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-3.5 border-t border-line-soft pt-3 text-2xs leading-relaxed text-ink-4">
        Selected variant: {product.brand} iPhone 17 Pro Max, {storage.name},{' '}
        {product.color}. Demo interface — no order is placed and no payment is taken.
      </p>
    </aside>
  )
}