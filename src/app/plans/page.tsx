import { createClient } from '@/lib/supabase/server'
import { PlansGrid } from '@/components/plans/PlansGrid'
import type { Plan } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Планове за магазин',
  description: 'Отвори онлайн магазин за 3D принтирани продукти в 3DPrintingBG. Избери план — Free, Starter, Pro, Business или Unlimited.',
  alternates: { canonical: '/plans' },
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>
}) {
  const params = await searchParams
  const cancelled = params.cancelled === '1'

  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order')

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {cancelled && (
        <div
          className="max-w-2xl mx-auto mb-8 rounded-xl px-5 py-3.5 text-sm text-center font-semibold"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          ❌ Плащането беше отказано. Избери план по-долу, за да опиташ отново.
        </div>
      )}

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
