import { Store } from 'lucide-react'
import { product } from '@/data/product'
import { StarRating } from '@/components/ui/StarRating'

export function ProductHeader() {
  return (
    <header className="space-y-2">
      <h1 className="text-title-lg font-normal leading-snug text-ink md:text-[1.4375rem]">
        <span className="font-semibold">{product.brand} </span>
        <span className="font-normal">
          iPhone 17 Pro Max 256 GB: 17.42 cm (6.9″) Display with Promotion, A19 Pro Chip, Best
          Battery Life in Any iPhone Ever, Pro Fusion Camera System, Center Stage Front Camera;
        </span>{' '}
        <span className="font-medium text-ink-2">{product.color}</span>
      </h1>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <a href="#reviews" className="flex items-center gap-1.5 hover:text-link">
          <StarRating value={product.ratingValue} />
          <span className="text-sm text-link">
            {product.ratingValue} out of 5 stars
          </span>
        </a>
        <a href="#reviews" className="text-sm link">
          ({product.ratingCount.toLocaleString('en-IN')})
        </a>
      </div>

      <a
        href="#stores"
        className="inline-flex items-center gap-1.5 text-sm text-link hover:underline"
      >
        <Store className="size-4" aria-hidden />
        {product.visitStoreLabel}
      </a>
    </header>
  )
}