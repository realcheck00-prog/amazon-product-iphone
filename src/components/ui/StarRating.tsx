import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

type StarRatingProps = {
  /** Average rating, 0–5. Fractional values render a partially filled star. */
  value: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { px: 12, className: 'size-3' },
  md: { px: 15, className: 'size-[15px]' },
  lg: { px: 20, className: 'size-5' },
} as const

const STAR_GAP = 2

export function StarRating({ value, size = 'md', className }: StarRatingProps) {
  const { px, className: starClass } = sizeMap[size]
  const width = px * 5 + STAR_GAP * 4

  return (
    <span
      className={cn('relative inline-flex shrink-0 text-star', className)}
      style={{ width }}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {/* Track */}
      <span className="flex gap-[2px]">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={starClass} strokeWidth={1.25} fill="currentColor" opacity={0.24} />
        ))}
      </span>
      {/* Fill — clipped to the fractional portion */}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${(value / 5) * width}px` }}
        aria-hidden
      >
        <span className="flex gap-[2px]">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn(starClass, 'shrink-0')} strokeWidth={1.25} fill="currentColor" />
          ))}
        </span>
      </span>
    </span>
  )
}