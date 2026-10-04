import { cn } from '@/lib/cn'

type ChipProps = {
  children: React.ReactNode
  tone?: 'neutral' | 'deal' | 'success' | 'info'
  className?: string
}

const toneClass = {
  neutral: 'bg-surface-muted text-ink-2',
  deal: 'bg-[#fdecea] text-deal',
  success: 'bg-[#e7f5f1] text-success',
  info: 'bg-[#e8f3fa] text-info',
} as const

export function Chip({ children, tone = 'neutral', className }: ChipProps) {
  return <span className={cn('chip', toneClass[tone], className)}>{children}</span>
}