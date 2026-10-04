import { useEffect, useState } from 'react'
import { pageSections } from '@/data/product'
import { cn } from '@/lib/cn'

/**
 * Sticky in-page navigation. Highlights the section currently in view and
 * mirrors the anchor list rendered by the reference page.
 */
export function SectionNav() {
  const [activeId, setActiveId] = useState<string>(pageSections[0].id)

  useEffect(() => {
    const targets = pageSections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-140px 0px -60% 0px', threshold: 0.01 },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[calc(2rem+3.5rem)] z-30 hidden border-y border-line bg-surface md:block"
    >
      <ul className="page-gutter scrollbar-none mx-auto flex max-w-page items-center gap-1 overflow-x-auto">
        {pageSections.map((section) => {
          const isActive = activeId === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'block whitespace-nowrap border-b-2 px-3 py-2.5 text-xs transition-colors',
                  isActive
                    ? 'border-amber-400 font-semibold text-ink'
                    : 'border-transparent text-ink-2 hover:text-link',
                )}
              >
                {section.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}