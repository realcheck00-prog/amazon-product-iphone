import { Check, Plus, ShieldCheck } from 'lucide-react'
import { protectionPlan } from '@/data/product'
import { formatINR } from '@/lib/format'
import { usePdp } from '@/state/pdp'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function ProtectionPlan() {
  const { hasProtection, setConfiguration, protectionPrice } = usePdp()

  return (
    <section
      id="buying-options"
      aria-label="Protection plan"
      className={cn('panel scroll-mt-28 overflow-hidden', hasProtection && 'ring-2 ring-success/60')}
    >
      <header className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Add a Protection Plan:</h2>
      </header>

      <div className="space-y-3 p-4">
        <div className="rounded-md bg-surface-sunken p-3 ring-1 ring-line">
          <p className="text-sm font-medium text-ink">
            {protectionPlan.shortTitle} for {formatINR(protectionPrice)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">
            from {protectionPlan.seller}
          </p>
          <ul className="mt-2 space-y-1">
            {protectionPlan.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-1.5 text-xs leading-relaxed text-ink-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs leading-relaxed text-ink-3">{protectionPlan.note}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={hasProtection ? 'outline' : 'primary'}
            size="sm"
            onClick={() =>
              setConfiguration(
                hasProtection
                  ? { name: 'Without Protect+', selected: true }
                  : { name: 'With Apple Care', price: protectionPlan.price },
              )
            }
            leadingIcon={
              hasProtection ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )
            }
          >
            {hasProtection ? 'Added to your order' : 'Add protection'}
          </Button>
          <button type="button" className="text-xs link link-underline">
            Skip
          </button>
          <a href="#plan-details" className="text-xs link link-underline">
            Learn more
          </a>
        </div>
      </div>
    </section>
  )
}