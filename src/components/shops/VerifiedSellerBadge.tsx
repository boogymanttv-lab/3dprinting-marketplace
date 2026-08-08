import { BadgeCheck } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
}

export function VerifiedSellerBadge({ size = 'sm' }: Props) {
  const isSmall = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full ${isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
      title="Продавач с потвърдена самоличност през Stripe — може да приема плащания с карта"
    >
      <BadgeCheck size={isSmall ? 11 : 13} />
      Проверен продавач
    </span>
  )
}
