import { Check } from 'lucide-react'
import { variants } from '@/data/product'
import { formatUSD } from '@/lib/format'
import { usePdp, type SelectedConfiguration, type SelectedStorage } from '@/state/pdp'
import { cn } from '@/lib/cn'

export function VariantSelector() {
  const { storage, setStorage, configuration, setConfiguration, hasProtection } = usePdp()

  return (
    <div className="space-y-4">
      {/* Colour — only the colour the reference renders as selected */}
      <fieldset>
        <legend className="mb-1.5 flex items-baseline gap-2 text-sm">
          <span className="text-ink-3">Colour:</span>
          <span className="font-medium text-ink">{variants.colors[0].name}</span>
          <span className="text-xs font-normal text-link link-underline cursor-pointer">
            Make a Colour selection
          </span>
        </legend>
        <ul className="flex flex-wrap items-center gap-2">
          {variants.colors.map((color) => (
            <li key={color.name}>
              <span
                className="relative block size-9 rounded-full ring-2 ring-ink ring-offset-2"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                <Check
                  className="absolute inset-0 m-auto size-4 text-white drop-shadow"
                  aria-hidden
                />
                <span className="sr-only">{color.name}</span>
              </span>
            </li>
          ))}
          <li>
            <span className="text-xs text-link link-underline">See available options</span>
          </li>
        </ul>
      </fieldset>

      {/* Size */}
      <fieldset>
        <legend className="mb-1.5 flex items-baseline gap-2 text-sm">
          <span className="text-ink-3">Size:</span>
          <span className="font-medium text-ink">{storage.name}</span>
          <span className="text-xs font-normal text-link link-underline cursor-pointer">
            Make a Size selection
          </span>
        </legend>
        <ul className="flex flex-wrap items-center gap-2">
          {variants.storages.map((option) => {
            const selected = option.name === storage.name
            return (
              <li key={option.name}>
                <button
                  type="button"
                  onClick={() => setStorage(option as SelectedStorage)}
                  aria-pressed={selected}
                  className={cn(
                    'relative min-w-[4.25rem] rounded-pill border px-3.5 py-2 text-sm transition-colors',
                    selected
                      ? 'border-ink font-semibold text-ink ring-1 ring-ink'
                      : 'border-line text-ink hover:border-ink-3 hover:bg-surface-sunken',
                  )}
                >
                  {option.name}
                  {option.price === null && (
                    <span
                      className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-surface-muted text-2xs font-bold text-ink-4 ring-1 ring-line"
                      aria-hidden
                    >
                      ?
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {/* Configuration */}
      <fieldset>
        <legend className="mb-1.5 flex items-baseline gap-2 text-sm">
          <span className="text-ink-3">Configuration:</span>
          <span className="font-medium text-ink">{configuration.name}</span>
          <span className="text-xs font-normal text-link link-underline cursor-pointer">
            Make a Configuration selection
          </span>
        </legend>
        <ul className="flex flex-wrap items-center gap-2">
          {variants.configurations.map((option) => {
            const selected = option.name === configuration.name
            return (
              <li key={option.name}>
                <button
                  type="button"
                  onClick={() => setConfiguration(option as SelectedConfiguration)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-pill border px-3.5 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'border-ink font-semibold text-ink ring-1 ring-ink'
                      : 'border-line text-ink hover:border-ink-3 hover:bg-surface-sunken',
                  )}
                >
                  {option.name}
                  {'price' in option && option.price !== undefined && option.price > 0 && (
                    <span className="tnum ml-1.5 text-xs font-normal text-ink-3">
                      +{formatUSD(option.price)}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {hasProtection && (
        <p className="text-xs text-success">
          {configuration.name} selected — {variants.configurations[1].name.replace('With ', '')}{' '}
          added to your order.
        </p>
      )}
    </div>
  )
}