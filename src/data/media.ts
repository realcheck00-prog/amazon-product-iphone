/**
 * Uploaded product photos in priority order — `/images/1.png` is the primary
 * image and the default everywhere the product is shown (PDP, cart, checkout).
 * Images 2–5 fill the PDP thumbnail rail.
 */
export const productImages = [
  '/images/1.png',
  '/images/2.png',
  '/images/3.png',
  '/images/4.png',
  '/images/5.png',
] as const

export const primaryProductImage = productImages[0]
