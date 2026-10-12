import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storefront } from '@/data/product'

/** Amazon-inspired checkout header: brand, heading, back link, secure note. */
export function CheckoutHeader() {
  return (
    <header className="border-b border-line bg-navy-800 text-white">
      <div className="page-gutter mx-auto flex max-w-page flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-baseline gap-1.5 text-xl font-bold tracking-tight"
            aria-label={`${storefront.name} home`}
          >
            <span>{storefront.name}</span>
          </Link>
          <h1 className="hidden border-l border-white/20 pl-4 text-lg font-medium text-white/90 md:block">
            Checkout
          </h1>
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <p className="flex items-center gap-1.5 text-xs text-white/80">
            <Lock className="size-3.5" aria-hidden />
            Secure checkout
          </p>
          <Link to="/" className="text-xs text-white/80 hover:text-amber-400 hover:underline">
            Back to shopping
          </Link>
        </div>
      </div>
      <h1 className="page-gutter mx-auto max-w-page pb-3 text-lg font-medium text-white/90 md:hidden">
        Checkout
      </h1>
    </header>
  )
}
