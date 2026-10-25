'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Plan, BillingInterval } from '@/types'

export interface PlansShop {
  id: string
  planId: string
  hasSubscription: boolean   // има активен Stripe абонамент
  expiresAt: string | null
}

export function PlansGrid({ plans, shop = null }: { plans: Plan[]; shop?: PlansShop | null }) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Магазинът вече съществува → надграждане през Stripe Checkout (без активен абонамент)
  // или през Stripe портала (ако вече има абонамент — иначе ще се плаща два пъти).
  async function changePlan(planId: string) {
    if (!shop) return
    setError('')
    setBusyPlan(planId)
    try {
      const res = shop.hasSubscription
        ? await fetch('/api/stripe/portal', { method: 'POST' })
        : await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, interval, shopId: shop.id }),
          })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError(data.error || 'Грешка при връзка със Stripe.')
    } catch {
      setError('Грешка при връзка със Stripe.')
    }
    setBusyPlan(null)
  }

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

      {error && (
        <p className="text-sm text-center mb-4 rounded-lg px-4 py-2.5 max-w-xl mx-auto"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</p>
      )}
      {shop && (
        <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
          Магазинът ти е на план <strong style={{ color: 'var(--text)' }}>{plans.find(p => p.id === shop.planId)?.name ?? shop.planId}</strong>
          {shop.expiresAt && shop.planId !== 'free' && !shop.hasSubscription
            ? ` · важи до ${new Date(shop.expiresAt).toLocaleDateString('bg-BG')}` : ''}
          . Можеш да го надградиш или смениш по-долу.
        </p>
      )}

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

              {shop ? (
                plan.id === shop.planId ? (
                  <div className="text-center py-2.5 rounded-xl text-sm font-bold mt-auto"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                    ✓ Текущ план
                  </div>
                ) : isFree ? (
                  <Link href="/dashboard/settings"
                    className="block text-center py-2.5 rounded-xl text-sm font-bold mt-auto"
                    style={{ border: '1px solid var(--border)', color: 'var(--muted)', textDecoration: 'none' }}>
                    Управление →
                  </Link>
                ) : (
                  <button
                    onClick={() => changePlan(plan.id)}
                    disabled={busyPlan !== null}
                    className="block w-full text-center py-2.5 rounded-xl text-sm font-bold mt-auto transition-opacity"
                    style={{
                      background: isPro ? 'var(--accent)' : 'transparent',
                      color: isPro ? '#fff' : 'var(--text)',
                      border: isPro ? 'none' : '1px solid var(--border)',
                      cursor: 'pointer',
                      opacity: busyPlan !== null ? 0.6 : 1,
                    }}
                  >
                    {busyPlan === plan.id ? 'Зареждане...' : shop.hasSubscription ? 'Смени плана →' : 'Надгради →'}
                  </button>
                )
              ) : (
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
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
