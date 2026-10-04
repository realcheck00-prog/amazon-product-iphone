import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Play, RotateCw } from 'lucide-react'
import { product } from '@/data/product'
import { cn } from '@/lib/cn'

type GalleryItem = {
  src: string
  /** Accessible label; also shown as the tile overlay. */
  label: string
  kind: 'image' | 'video'
}

const media: GalleryItem[] = [
  { src: '/images/phone-angle.svg', label: 'Three-quarter view', kind: 'image' },
  { src: '/images/phone-front.svg', label: 'Front display', kind: 'image' },
  { src: '/images/phone-back.svg', label: 'Back in Cosmic Orange', kind: 'image' },
  { src: '/images/phone-camera.svg', label: '48MP Pro Fusion camera system', kind: 'image' },
  { src: '/images/phone-side.svg', label: 'Aluminium unibody edge', kind: 'image' },
  { src: '/images/in-the-box.svg', label: 'In the box', kind: 'image' },
  { src: '/images/phone-angle.svg', label: 'Product video', kind: 'video' },
]

const colorWord = product.color.split(' ')[0] ?? product.color

export function ImageGallery() {
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<'images' | 'videos' | 'spin'>('images')
  const stripRef = useRef<HTMLUListElement>(null)

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
                {item.kind === 'video' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/25">
                    <Play className="size-4 fill-white text-white" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Stage */}
        <div className="relative min-w-0 flex-1">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card bg-surface p-4 md:p-8">
            <img
              key={active.src}
              src={active.src}
              alt={`${product.brand} iPhone 17 Pro Max in ${product.color} — ${active.label}`}
              className="max-h-full w-full animate-fade-in object-contain drop-shadow-[0_18px_28px_rgb(15_17_17_/_0.14)]"
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

            {active.kind === 'video' && (
              <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-ink/85 px-3.5 py-1.5 text-xs font-medium text-white">
                <Play className="size-3.5 fill-white" aria-hidden />
                Play product video
              </span>
            )}
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
              { id: 'videos', label: 'VIDEOS', icon: Play },
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
function filterMedia(mode: 'images' | 'videos' | 'spin'): GalleryItem[] {
  if (mode === 'videos') return media.filter((m) => m.kind === 'video')
  if (mode === 'spin') return media.filter((m) => m.kind === 'image').slice(0, 3)
  return media.filter((m) => m.kind === 'image')
}