import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { ChevronLeft, ChevronRight, Expand, RotateCw } from 'lucide-react'
import { product } from '@/data/product'
import { cn } from '@/lib/cn'

type GalleryItem = {
  src: string
  /** Accessible label; also shown as the tile overlay. */
  label: string
}

/**
 * Uploaded product photos in priority order — `/images/1.png` is the primary
 * image and the default on load; images 2–5 fill the thumbnail rail.
 */
const productImages = [
  '/images/1.png',
  '/images/2.png',
  '/images/3.png',
  '/images/4.png',
  '/images/5.png',
]

const media: GalleryItem[] = productImages.map((src, i) => ({
  src,
  label: `Product image ${i + 1}`,
}))

const colorWord = product.color.split(' ')[0] ?? product.color

export function ImageGallery() {
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<'images' | 'spin'>('images')
  const stripRef = useRef<HTMLUListElement>(null)
  const touchStartX = useRef<number | null>(null)

  const visible = useMemo(() => filterMedia(mode), [mode])
  const active = visible[Math.min(index, visible.length - 1)] ?? visible[0]

  useEffect(() => {
    setIndex(0)
  }, [mode])

  useEffect(() => {
    const node = stripRef.current?.children[index] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [index])

  function step(delta: number) {
    setIndex((i) => (i + delta + visible.length) % visible.length)
  }

  /** Swipe left/right on the stage moves between images on touch devices. */
  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  function handleTouchEnd(e: TouchEvent) {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null) return
    const dx = e.changedTouches[0].clientX - start
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
  }

  return (
    <div id="videos" className="flex flex-col gap-3">
      <div className="flex flex-col-reverse gap-3 md:flex-row">
        {/* Thumbnail rail — vertical on desktop, horizontal on mobile */}
        <ul
          ref={stripRef}
          className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto md:max-h-[420px] md:flex-col md:overflow-y-auto md:overflow-x-hidden"
          aria-label={`${product.brand} iPhone 17 Pro Max media`}
        >
          {visible.map((item, i) => (
            <li key={`${item.label}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={item.label}
                aria-current={i === index}
                className={cn(
                  'group relative block size-[68px] overflow-hidden rounded-md border bg-surface p-1 transition-colors',
                  i === index
                    ? 'border-ink'
                    : 'border-line hover:border-ink-3',
                )}
              >
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  className="size-full object-contain"
                />
              </button>
            </li>
          ))}
        </ul>

        {/* Stage */}
        <div className="relative min-w-0 flex-1">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative flex aspect-square touch-pan-y items-center justify-center overflow-hidden rounded-card bg-surface p-4 md:p-8"
          >
            <img
              key={active.src}
              src={active.src}
              alt={`${product.brand} iPhone 17 Pro Max in ${product.color} — ${active.label}`}
              className="max-h-full w-full animate-fade-in object-contain drop-shadow-[0_18px_28px_rgb(15_17_17/_0.14)]"
            />

            <span className="pointer-events-none absolute left-3 top-3 rounded-pill bg-surface/85 px-2 py-1 text-2xs font-medium text-ink-2 backdrop-blur">
              {colorWord} · {product.storage}
            </span>

            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous media"
              className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised hover:bg-surface"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next media"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised hover:bg-surface"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-ink-3">{active.label}</p>
        </div>
      </div>

      {/* Media mode switcher */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="Media type"
        >
          {(
            [
              { id: 'spin', label: '360° VIEW', icon: RotateCw },
              { id: 'images', label: 'IMAGES', icon: Expand },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-2xs font-semibold tracking-wide transition-colors',
                  mode === tab.id
                    ? 'bg-surface-sunken text-ink ring-1 ring-line'
                    : 'text-ink-3 hover:text-link',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {tab.label}
              </button>
            )
          })}
        </div>
        <span className="text-2xs text-ink-4">
          {index + 1} / {visible.length}
        </span>
      </div>
    </div>
  )
}

/** Keeps the rail in sync with the active tab. */
function filterMedia(mode: 'images' | 'spin'): GalleryItem[] {
  if (mode === 'spin') return media.slice(0, 3)
  return media
}
