import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type PanelProps = {
  title?: ReactNode
  /** Renders the heading as an `h2`. Use `false` for sections without a heading. */
  headingLevel?: 2 | 3
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
  id?: string
}

/** White card used for every major block of the page. */
export function Panel({
  title,
  headingLevel = 2,
  action,
  className,
  bodyClassName,
  children,
  id,
}: PanelProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section id={id} className={cn('panel scroll-mt-28', className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 md:px-5">
          <Heading className="text-base font-semibold tracking-[-0.01em] text-ink md:text-lg">
            {title}
          </Heading>
          {action}
        </header>
      ) : null}
      <div
        className={cn(
          'px-4 pb-4 md:px-5 md:pb-5',
          title ? 'border-t border-line-soft pt-4' : '',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}