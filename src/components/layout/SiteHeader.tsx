import { useState } from 'react'
import {
  ChevronDown,
  Globe,
  MapPin,
  Menu,
  RotateCcw,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react'
import { storefront } from '@/data/product'

const departments = [
  'All',
  'Mobiles',
  "Today's Deals",
  'Electronics',
  'Computers',
  'New Releases',
  'Bestsellers',
  'Video Games',
  'Fashion',
  'Home & Kitchen',
  'Beauty',
  'Toys & Games',
  'Sports & Outdoors',
  'Prime',
  'Customer Service',
]

export function SiteHeader() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="bg-navy-900 text-[0.75rem] text-white/85">
        <div className="page-gutter mx-auto flex h-8 max-w-page items-center justify-between gap-4">
          <button
            type="button"
            className="flex items-center gap-1.5 whitespace-nowrap hover:text-amber-400"
          >
            <MapPin className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">
              Deliver to {storefront.deliverToCity} {storefront.deliverToPostalCode}
            </span>
            <span className="sm:hidden">Deliver to {storefront.deliverToPostalCode}</span>
          </button>

          <nav className="hidden items-center gap-4 md:flex" aria-label="Account">
            <a className="hover:text-white" href="#top">
              <User className="size-3.5" aria-hidden />
              <span className="ml-1.5">Hello, sign in</span>
            </a>
            <a className="hover:text-white" href="#orders">
              <RotateCcw className="size-3.5" aria-hidden />
              <span className="ml-1.5">Returns &amp; Orders</span>
            </a>
            <span className="h-4 w-px bg-white/20" aria-hidden />
            <button type="button" className="flex items-center gap-1 hover:text-white">
              <Globe className="size-3.5" aria-hidden />
              EN
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </nav>
        </div>
      </div>

      {/* Primary bar */}
      <div className="bg-navy-800 text-white">
        <div className="page-gutter mx-auto flex h-14 max-w-page items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm px-1.5 py-1 hover:border border-amber-400 md:flex md:flex-row md:gap-1.5"
          >
            <Menu className="size-5" aria-hidden />
            <span className="hidden text-xs md:inline">All</span>
          </button>

          <a
            href="#top"
            className="flex shrink-0 items-baseline gap-1.5 px-1 text-lg font-bold tracking-tight md:text-xl"
          >
            <span>{storefront.name}</span>
            <span className="rounded-xs bg-amber-300 px-1 py-px text-[0.5625rem] font-semibold tracking-wide text-ink uppercase">
              Demo
            </span>
          </a>

          <form
            className="flex min-w-0 flex-1 items-stretch"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="sr-only" htmlFor="site-search">
              Search {storefront.market}
            </label>
            <select
              id="site-search-category"
              className="hidden rounded-l-md border-0 bg-surface-muted px-2 py-2 text-xs text-ink-2 outline-none sm:block"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {departments.slice(0, 6).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Shopfront"
              className="min-w-0 flex-1 rounded-none border-0 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex shrink-0 items-center justify-center rounded-r-md bg-amber-300 px-3.5 text-ink hover:bg-amber-400"
            >
              <Search className="size-4.5" aria-hidden />
            </button>
          </form>

          <a
            href="#cart"
            className="hidden shrink-0 items-center gap-1.5 px-2 text-sm hover:text-amber-400 lg:flex"
          >
            <span className="flex flex-col items-end leading-none">
              <span className="text-xs">Hello, sign in</span>
              <span className="text-xs text-white/70">Account &amp; Lists</span>
            </span>
          </a>
          <a href="#cart" className="flex shrink-0 items-center gap-1.5 px-1.5 hover:text-amber-400">
            <span className="flex flex-col items-center leading-none">
              <ShoppingCart className="size-6" aria-hidden />
              <span className="text-xs font-bold">0</span>
            </span>
            <span className="hidden text-xs lg:inline">Cart</span>
          </a>
        </div>
      </div>

      {/* Department strip */}
      <div
        className={`overflow-hidden border-t border-white/10 bg-navy-700 text-white transition-[max-height] duration-200 md:block ${
          menuOpen ? 'max-h-96' : 'max-h-0 md:max-h-none'
        }`}
      >
        <ul className="page-gutter scrollbar-none mx-auto flex max-w-page items-center gap-4 overflow-x-auto py-1.5 text-xs">
          {departments.map((d) => (
            <li key={d} className="shrink-0">
              <a href="#top" className="block whitespace-nowrap py-1 hover:text-amber-400">
                {d}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}