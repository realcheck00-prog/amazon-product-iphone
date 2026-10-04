import { useRef } from 'react'
import { ChevronLeft, ChevronRight, HandCoins, Landmark, Percent, Receipt } from 'lucide-react'
import { offers } from '@/data/product'

const icons = {
  Cashback: HandCoins,
  'No Cost EMI': Percent,
  'Bank Offer': Landmark,
  'Partner Offers': Receipt,
} as const

/**
 * Horizontal offer carousel — mirrors the reference's "Offers" strip with
 * previous/next paging on desktop and swipe on mobile.
 */
export function OffersStrip() {
  const trackRef = useRef<HTMLUListElement>(null)

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section aria-label="Offers" className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-soft px-4 pt-3.5 pb-2.5">
        <h2 className="text-sm font-semibold text-ink">
          <span className="mr-2 inline-block size-1.5 translate-y-px rounded-full bg-deal" />
          Offers
        </h2>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            aria-label="Previous offers"
            onClick={() => page(-1)}
            className="flex size-6 items-center justify-center rounded-full bg-surface-muted text-ink hover:bg-[#e4e4e4]"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next offers"
            onClick={() => page(1)}
            className="flex size-6 items-center justify-center rounded-full bg-surface-muted text-ink hover:bg-[#e4e4e4]"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto p-3"
      >
        {offers.map((offer) => {
          const Icon = icons[offer.kind as keyof typeof icons] ?? Percent
          return (
            <li
              key={offer.kind}
              className="w-[16rem] shrink-0 snap-start rounded-md bg-surface-sunken p-3 ring-1 ring-line"
            >
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-deal" aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-ink">{offer.kind}</p>
                  <p className="text-xs leading-relaxed text-ink-2">{offer.title}</p>
                  {offer.detail && <p className="text-xs text-ink-3">{offer.detail}</p>}
                  <p className="pt-0.5 text-2xs font-medium text-success">{offer.count}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}