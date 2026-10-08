import { CreditCard } from 'lucide-react'
import { price } from '@/data/product'
import { formatUSDShort } from '@/lib/format'
import { usePdp } from '@/state/pdp'

export function EmiBlock() {
  const { unitPrice, hasProtection } = usePdp()
  const available = unitPrice !== null

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <a href="#emi" className="inline-flex items-center gap-1.5 text-link hover:underline">
        <CreditCard className="size-4 shrink-0" aria-hidden />
        {available ? (
          <>
            EMI starts at {formatUSDShort(price.emi.monthly)} per month.
            {price.emi.noCostEmiAvailable && ' No Cost EMI available'}
          </>
        ) : (
          'See EMI options'
        )}
      </a>
      {available && (
        <span className="text-xs text-ink-4">
          {hasProtection ? 'Includes the selected Protect+ plan' : 'No Cost EMI available'}
        </span>
      )}
    </div>
  )
}