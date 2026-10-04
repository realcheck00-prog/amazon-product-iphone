import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export type Crumb = { label: string; href?: string }

/** Reference-style breadcrumb trail above the product title. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-xs', className)}>
      <ol className="flex flex-wrap items-center gap-0.5 text-ink-3">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="size-3 text-ink-4" aria-hidden />}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="text-ink-3">
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="link link-underline">
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}