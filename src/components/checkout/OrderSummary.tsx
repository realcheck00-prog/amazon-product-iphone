import { Lock } from 'lucide-react'
import { formatCents } from '@/lib/format'

export type SummaryItem = {
  id: string
  title: string
  image: string
  variant: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export type OrderSummaryProps = {
  items: SummaryItem[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  currency: string
}

/** Amazon-style order summary: line items, subtotal, shipping and total. */
export function OrderSummary({
  items,
  subtotalCents,
  shippingCents,
  totalCents,
  currency,
}: OrderSummaryProps) {
  return (
    <section aria-labelledby="order-summary-heading" className="panel p-4 md:p-5">
      <h2 id="order-summary-heading" className="text-lg font-semibold text-ink">
        Order Summary
      </h2>

      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <img
              src={item.image}
              alt=""
              className="size-16 shrink-0 rounded-md border border-line-soft bg-surface object-contain p-1.5"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 text-sm text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-ink-3">{item.variant}</p>
              <p className="tnum mt-1 text-xs text-ink-2">
                Qty {item.quantity} · {formatCents(item.unitPriceCents, currency)} each
              </p>
            </div>
            <span className="tnum shrink-0 text-sm font-semibold text-ink">
              {formatCents(item.lineTotalCents, currency)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-line-soft pt-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-2">Subtotal</dt>
          <dd className="tnum text-ink">{formatCents(subtotalCents, currency)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-2">Shipping &amp; handling</dt>
          <dd className="tnum text-ink">
            {shippingCents === 0 ? formatCents(0, currency) : formatCents(shippingCents, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-line-soft pt-2 text-base font-semibold">
          <dt className="text-ink">Order total</dt>
          <dd className="tnum text-ink">{formatCents(totalCents, currency)}</dd>
        </div>
      </dl>

      <p className="mt-3 flex items-start gap-1.5 border-t border-line-soft pt-3 text-2xs leading-relaxed text-ink-3">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden />
        <span>
          Shipping and taxes are shown as $0.00 — free delivery is applied to this order.
        </span>
      </p>
    </section>
  )
}
