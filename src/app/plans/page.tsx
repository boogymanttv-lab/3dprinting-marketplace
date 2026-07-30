import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Plan } from '@/types'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order')

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {[
          { n: 1, label: 'Избери план' },
          { n: 2, label: 'Основна информация' },
          { n: 3, label: 'Фирмени данни' },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: step.n === 1 ? 'var(--accent)' : 'var(--bg3)',
                  color: step.n === 1 ? '#fff' : 'var(--muted)',
                  border: `2px solid ${step.n === 1 ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {step.n}
              </div>
              <span className="text-xs mt-1.5 whitespace-nowrap" style={{ color: step.n === 1 ? 'var(--text)' : 'var(--muted)' }}>
                {step.label}
              </span>
            </div>
            {i < 2 && (
              <div className="w-16 sm:w-24 h-0.5 mx-2 mb-4" style={{ background: 'var(--border)' }} />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-black mb-2">Избери своя план</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Започни безплатно, надгради когато растеш. Можеш да смениш по всяко време.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
        {plans?.map((plan: Plan) => {
          const isPro = plan.id === 'pro'
          const href = `/open-shop?plan=${plan.id}`

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
                  {plan.price_monthly === 0 ? '0 €' : `${plan.price_monthly.toFixed(2)} €`}
                </p>
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>/месец</p>
                <p className="text-xs font-bold mb-4" style={{ color: 'var(--accent)' }}>
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
                {plan.price_monthly === 0 ? 'Започни безплатно →' : 'Избери →'}
              </Link>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center mt-8" style={{ color: 'var(--muted)' }}>
        💳 Плащането ще бъде активирано скоро. Засега всички планове са безплатни.
      </p>
    </div>
  )
}
