'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Suspense } from 'react'

const COUNTDOWN = 30

function OpenShopForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const interval = (searchParams.get('interval') === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly'

  if (!planId) {
    router.replace('/plans')
    return null
  }

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', description: '', city: '', phone: '',
    company_name: '', eik: '', vat_number: '', company_address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 'idle' | 'counting' | 'done' | 'redirecting'
  const [successState, setSuccessState] = useState<'idle' | 'counting' | 'done' | 'redirecting'>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [shopSlug, setShopSlug] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Въведи ime на магазина.'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { router.push('/login?redirectTo=/open-shop'); return }

    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6)
    const isPaidPlan = planId !== 'free'

    const { data: newShop, error: shopError } = await supabase.from('shops').insert({
      owner_id: user.id,
      name: form.name,
      slug,
      description: form.description || null,
      city: form.city || null,
      phone: form.phone || null,
      company_name: form.company_name || null,
      eik: form.eik || null,
      vat_number: form.vat_number || null,
      company_address: form.company_address || null,
      // Магазинът винаги стартира на Free — платеният план се активира
      // едва след успешно плащане през Stripe (виж по-долу).
      plan_id: isPaidPlan ? 'free' : planId,
    }).select('id').single()

    if (shopError || !newShop) {
      setError('Грешка при създаването. Може би вече имаш магазин.')
      setLoading(false)
      return
    }

    // Платен план → пращаме към Stripe Checkout, за да завърши плащането
    if (isPaidPlan) {
      setSuccessState('redirecting')
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId: newShop.id, planId, interval }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError(data.error || 'Грешка при свързване със Stripe. Магазинът е създаден на безплатен план — можеш да надградиш по-късно от настройките.')
        setSuccessState('idle')
        setLoading(false)
      } catch {
        setError('Грешка при свързване със Stripe. Магазинът е създаден на безплатен план — можеш да надградиш по-късно от настройките.')
        setSuccessState('idle')
        setLoading(false)
      }
      return
    }

    // Start success countdown
    setShopSlug(slug)
    setLoading(false)
    setSuccessState('counting')
    setCountdown(COUNTDOWN)

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setSuccessState('done')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const planLabel: Record<string, string> = {
    free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business', unlimited: 'Unlimited'
  }

  // ── Redirecting to Stripe ─────────────────────────────────────────
  if (successState === 'redirecting') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
          💳
        </div>
        <h2 className="text-2xl font-black mb-2">Пренасочваме те към Stripe...</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Магазинът е създаден. Остава само да завършиш плащането сигурно през Stripe.
        </p>
      </div>
    )
  }

  // ── Success: counting ──────────────────────────────────────────────
  if (successState === 'counting') {
    const progress = ((COUNTDOWN - countdown) / COUNTDOWN) * 100
    const radius = 54
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference - (progress / 100) * circumference

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="relative inline-flex items-center justify-center mb-8">
          <svg width="140" height="140" className="rotate-[-90deg]">
            {/* Track */}
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg3)" strokeWidth="8" />
            {/* Progress */}
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          {/* Number in center */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black" style={{ color: 'var(--accent)' }}>{countdown}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>сек.</span>
          </div>
        </div>

        <div className="text-4xl mb-4">🏗️</div>
        <h2 className="text-2xl font-black mb-2">Създаваме магазина ти...</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Настройваме профила, активираме плана и подготвяме всичко за теб.
        </p>

        <div className="mt-8 rounded-2xl border p-5 text-left space-y-2.5"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {[
            { done: countdown < 28, label: 'Профил на магазина създаден' },
            { done: countdown < 22, label: 'Активиране на плана' },
            { done: countdown < 14, label: 'Настройване на каталога' },
            { done: countdown < 6,  label: 'Финална проверка' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  background: item.done ? 'rgba(34,197,94,0.15)' : 'var(--bg3)',
                  color: item.done ? '#22c55e' : 'var(--muted)',
                  border: `1.5px solid ${item.done ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                  transition: 'all 0.4s',
                }}>
                {item.done ? '✓' : '·'}
              </div>
              <span style={{ color: item.done ? 'var(--text)' : 'var(--muted)', transition: 'color 0.4s' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Success: done ──────────────────────────────────────────────────
  if (successState === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {/* Checkmark animation */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)', border: '3px solid rgba(34,197,94,0.4)' }}>
            <span className="text-5xl" style={{ animation: 'pop 0.4s ease-out' }}>✅</span>
          </div>
        </div>

        <h2 className="text-3xl font-black mb-3">Магазинът е успешно създаден!</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Добре дошъл в <strong style={{ color: 'var(--accent)' }}>{form.name}</strong>!
          Вече можеш да добавяш обяви и да приемаш поръчки.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/listings/new"
            className="px-8 py-3.5 rounded-xl text-sm font-bold text-center"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
          >
            ➕ Добави първа обява
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl text-sm font-bold text-center"
            style={{ border: '1.5px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}
          >
            🏪 Към магазина
          </Link>
        </div>

        <style>{`
          @keyframes pop {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl font-black mb-2">🏪 Отвори магазин</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        Попълни данните и започни да продаваш
      </p>

      {/* Steps */}
      <div className="flex items-center mb-10">
        {[
          { n: 1, label: 'Избери план' },
          { n: 2, label: 'Основна информация' },
          { n: 3, label: 'Фирмени данни' },
        ].map((s, i) => {
          const realStep = step + 1
          const done = s.n < realStep
          const active = s.n === realStep
          return (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg3)',
                    color: done || active ? '#fff' : 'var(--muted)',
                    border: `2px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {done ? '✓' : s.n}
                </div>
                <span className="text-xs mt-1 whitespace-nowrap hidden sm:block"
                  style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>
                  {s.n === 1 ? planLabel[planId] ?? 'План' : s.label}
                </span>
              </div>
              {i < 2 && (
                <div className="flex-1 h-0.5 mx-2 mb-4"
                  style={{ background: done ? 'var(--green)' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-bold text-base mb-1">🏪 Основна информация</h2>

            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Ime на магазина *</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.name} onChange={update('name')} placeholder="напр. PrintShop BG" required
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Описание</label>
              <textarea className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={inputStyle}
                value={form.description} onChange={update('description')}
                placeholder="Разкажи на купувачите какво продаваш..." rows={3}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Град</label>
                <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                  value={form.city} onChange={update('city')} placeholder="София"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>
                  Телефон <span className="text-xs px-1.5 py-0.5 rounded ml-1" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>по избор</span>
                </label>
                <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                  value={form.phone} onChange={update('phone')} placeholder="+359..." type="tel"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/plans" className="flex-1 py-2.5 text-center rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', textDecoration: 'none' }}>
                ← Смени план
              </Link>
              <button type="button" onClick={() => { if (!form.name.trim()) { setError('Въведи ime.'); return }; setError(''); setStep(2) }}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                Продължи →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div>
              <h2 className="font-bold text-base">🏢 Фирмени данни</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Попълни само ако издаваш фактури. Може да пропуснеш.
              </p>
            </div>

            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Фирма</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.company_name} onChange={update('company_name')} placeholder="ЕООД / АД / ЕТ"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'eik', label: 'ЕИК / Булстат', placeholder: '123456789' },
                { field: 'vat_number', label: 'ДДС номер', placeholder: 'BG123456789' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
                  <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                    value={form[field as keyof typeof form]} onChange={update(field)} placeholder={placeholder}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
                ← Назад
              </button>
              <button type="submit" disabled={loading}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Създаване...' : '🚀 Създай магазин'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default function OpenShopPage() {
  return <Suspense><OpenShopForm /></Suspense>
}
