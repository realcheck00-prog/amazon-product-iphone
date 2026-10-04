import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

type DisclosureProps = {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  summaryClassName?: string
}

/** Accessible show/hide block mirroring the reference's collapsible rows. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className={cn('border-b border-line-soft last:border-b-0', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-ink hover:text-link',
          summaryClassName,
        )}
      >
        <span>{summary}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-ink-3 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        id={contentId}
        hidden={!open}
        className="animate-fade-in pb-4 text-sm leading-relaxed text-ink-2"
      >
        {children}
      </div>
    </div>
  )
}