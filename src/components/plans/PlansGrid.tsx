'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Plan, BillingInterval } from '@/types'

export function PlansGrid({ plans }: { plans: Plan[] }) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  return (
    <>
      {/* Interval toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {(['monthly', 'yearly'] as BillingInterval[]).map(opt => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: interval === opt ? 'var(--accent)' : 'transparent',
                color: interval === opt ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {opt === 'monthly' ? 'Месечно' : 'Годишно'}
              {opt === 'yearly' && (
                <span
                  className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: interval === opt ? 'rgba(255,255,255,0.25)' : 'rgba(34,197,94,0.15)',
                    color: interval === opt ? '#fff' : '#22c55e',
                  }}
                >
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
        {plans.map(plan => {
          const isPro = plan.id === 'pro'
          const isFree = plan.price_monthly === 0
          const href = `/open-shop?plan=${plan.id}&interval=${interval}`

          const displayPrice = interval === 'yearly' ? (plan.price_yearly ?? plan.price_monthly * 12) : plan.price_monthly
          const periodLabel = interval === 'yearly' ? '/година' : '/месец'
          const monthlyEquivalent = interval === 'yearly' && !isFree
            ? (plan.price_yearly ?? 0) / 12
            : null

          return (
            <div
              key={plan.id}
              className="rounded-2xl border p-5 relative flex flex-col"
              style={{
                background: isPro ? 'rgba(249,115,22,0.05)' : 'var(--card)',
                borderColor: isPro ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {isPro && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Най-популярен
                </div>
              )}

              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                  {plan.name}
                </p>
                <p className="text-3xl font-black mb-0.5">
                  {isFree ? '0 €' : `${displayPrice.toFixed(2)} €`}
                </p>
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  {isFree ? 'завинаги' : periodLabel}
                </p>
                {monthlyEquivalent !== null && (
                  <p className="text-xs mb-1" style={{ color: '#22c55e' }}>
                    ≈ {monthlyEquivalent.toFixed(2)} €/месец
                  </p>
                )}
                <p className="text-xs font-bold mb-4 mt-1" style={{ color: 'var(--accent)' }}>
                  {plan.max_listings === null ? '∞ Безлимитни обяви' : `${plan.max_listings} обяви`}
                </p>

                <ul className="space-y-2 mb-6">
                  {(plan.features as string[]).map((f, i) => (
                    <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--muted)' }}>
                      <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={href}
                className="block text-center py-2.5 rounded-xl text-sm font-bold mt-auto transition-opacity"
                style={{
                  background: isPro ? 'var(--accent)' : 'transparent',
                  color: isPro ? '#fff' : 'var(--text)',
                  border: isPro ? 'none' : '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                {isFree ? 'Започни безплатно →' : 'Избери →'}
              </Link>
            </div>
          )
        })}
      </div>
    </>
  )
}
