/**
 * Programmatic mirror of the CSS design system in `src/styles/index.css`.
 * Only values that need to be consumed from TypeScript (not from CSS)
 * live here — everything visual stays in the stylesheet.
 */

/** Amazon PDP desktop column widths (px). */
export const layout = {
  /** Left gallery column. */
  gallery: 500,
  /** Middle information column. */
  info: 340,
  /** Right buy box column. */
  buyBox: 320,
  /** Sticky in-page section navigation height. */
  stickyNav: 44,
  /** Sticky header total height (top bar + nav bar). */
  header: 100,
} as const

export const rating = {
  /** Ratings shown for this product. */
  count: 654,
  /** Average rating. */
  value: 4.7,
  /** Percentage breakdown per star, highest first. */
  breakdown: [
    { stars: 5, percent: 86 },
    { stars: 4, percent: 7 },
    { stars: 3, percent: 2 },
    { stars: 2, percent: 1 },
    { stars: 1, percent: 4 },
  ],
} as const

export const motion = {
  /** Duration for hover/press feedback. */
  fast: 120,
  /** Duration for entering elements. */
  base: 160,
} as const