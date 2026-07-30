import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'info' | 'muted'
  className?: string
}

const variantStyles = {
  default: 'bg-orange-500/15 text-orange-400',
  success: 'bg-green-500/15 text-green-400',
  warning: 'bg-amber-500/15 text-amber-400',
  info:    'bg-blue-500/15 text-blue-400',
  muted:   'bg-white/5 text-[var(--muted)]',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variantStyles[variant], className)}>
      {children}
    </span>
  )
}
