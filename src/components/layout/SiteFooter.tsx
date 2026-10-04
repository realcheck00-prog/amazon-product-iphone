import { CreditCard, Globe, Lock, ShieldCheck } from 'lucide-react'
import { storefront } from '@/data/product'

const columns = [
  {
    heading: 'Shop',
    links: ['Mobiles', 'Electronics', 'Fashion', 'Home & Kitchen', 'Deals'],
  },
  {
    heading: 'Help',
    links: ['Customer Service', 'Returns & Orders', 'Delivery Information', 'Contact Us'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Press', 'Sustainability'],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-8 bg-navy-800 text-white/80">
      <div className="page-gutter mx-auto max-w-page py-8">
        <div className="grid gap-6 border-b border-white/10 pb-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-amber-400" aria-hidden />
              <span className="text-sm font-semibold text-white">Safe, secure shopping</span>
            </div>
            <p className="text-xs leading-relaxed">
              We work hard to protect your security and privacy. Our payment security system encrypts
              your information during transmission.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="mb-2 text-sm font-semibold text-white">{col.heading}</h2>
              <ul className="space-y-1.5 text-xs">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="hover:text-amber-400 hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[0.6875rem] sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-relaxed">
            <strong className="font-semibold text-white">Demo interface.</strong> This page is an
            unaffiliated front-end demonstration. {storefront.name} is not affiliated with, endorsed
            by, or connected to Amazon.com or Amazon India. Product names, brands and marks belong to
            their respective owners, and all listed prices, offers and seller details are static
            sample data.
          </p>
          <ul className="flex shrink-0 items-center gap-3">
            <li className="flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden /> Secure payments
            </li>
            <li className="flex items-center gap-1.5">
              <CreditCard className="size-3.5" aria-hidden /> All cards
            </li>
            <li className="flex items-center gap-1.5">
              <Globe className="size-3.5" aria-hidden /> {storefront.market}
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}