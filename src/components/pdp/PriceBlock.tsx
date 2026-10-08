import { Info } from 'lucide-react'
import { price, protectionPlan, variants } from '@/data/product'
import { formatUSD } from '@/lib/format'
import { usePdp } from '@/state/pdp'

const baseStorageName = variants.storages[0].name

export function PriceBlock() {
  const { totalPrice, unitPrice, hasProtection, storage } = usePdp()
  const unavailable = totalPrice === null

  return (
    <div className="space-y-1.5">
      {unavailable ? (
        <div className="rounded-md bg-surface-sunken px-3 py-2.5 ring-1 ring-line">
          <p className="text-sm font-semibold text-ink">See available options</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
            Pricing for the {storage.name} variant is not published on this page. Select{' '}
            {baseStorageName} to continue.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="tnum text-price font-semibold text-price">{formatUSD(totalPrice)}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
        {price.inclusiveOfTaxes && (
          <span className="inline-flex items-center gap-1">
            Inclusive of all taxes
            <Info className="size-3.5 text-ink-4" aria-label="Inclusive of all taxes" />
          </span>
        )}
        {hasProtection && unitPrice !== null && protectionPlan.price > 0 && (
          <span className="tnum text-ink-3">
            Includes {formatUSD(protectionPlan.price)} Protect+ with AppleCare Services
          </span>
        )}
      </div>

      {!unavailable && (
        <p className="max-w-prose text-xs text-ink-4">
          Price inclusive of all taxes. Shipping cost, delivery date and order total (including
          tax) shown at checkout.
        </p>
      )}
    </div>
  )
}