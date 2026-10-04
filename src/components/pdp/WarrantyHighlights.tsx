import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { warrantyCards } from '@/data/product'

/** Reference-style pill strip of trust/warranty highlights with paging. */
export function WarrantyHighlights() {
  const trackRef = useRef<HTMLUListElement>(null)

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.75, behavior: 'smooth' })
  }

  return (
    <section aria-label="Warranty and service" className="panel overflow-hidden">
      <div className="flex items-center justify-between px-2 pt-2.5 pb-1.5">
        <button
          type="button"
          aria-label="Previous highlights"
          onClick={() => page(-1)}
          className="hidden size-6 items-center justify-center rounded-full bg-surface-muted text-ink hover:bg-[#e4e4e4] sm:flex"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <ul
          ref={trackRef}
          className="scrollbar-none flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto"
        >
          {warrantyCards.map((card) => (
            <li key={card.title} className="w-[13.5rem] shrink-0 snap-start text-center">
              <div className="flex h-full flex-col items-center gap-1 rounded-md bg-surface-sunken px-2 py-3">
                <span className="line-clamp-2 text-2xs font-semibold leading-snug text-ink">
                  {card.title}
                </span>
                <span className="line-clamp-3 text-2xs leading-snug text-ink-3">{card.body}</span>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Next highlights"
          onClick={() => page(1)}
          className="hidden size-6 items-center justify-center rounded-full bg-surface-muted text-ink hover:bg-[#e4e4e4] sm:flex"
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </section>
  )
}