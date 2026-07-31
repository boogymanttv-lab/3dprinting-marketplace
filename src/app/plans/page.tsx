import { createClient } from '@/lib/supabase/server'
import { PlansGrid } from '@/components/plans/PlansGrid'
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

      <PlansGrid plans={(plans ?? []) as Plan[]} />

      <p className="text-xs text-center mt-8" style={{ color: 'var(--muted)' }}>
        💳 Плащането се обработва сигурно през Stripe. Можеш да смениш или отмениш плана си по всяко време.
      </p>
    </div>
  )
}
