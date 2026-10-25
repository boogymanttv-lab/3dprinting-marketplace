'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Turnstile } from '@/components/Turnstile'
import { OtpInput } from '@/components/OtpInput'

// Възстановяване на парола с 8-цифрен код по имейл (същият стил като регистрацията).
// Изисква шаблонът "Reset password" в Supabase да съдържа {{ .Token }}.
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (captchaRequired && !captchaToken) {
      setError('Моля, потвърди, че не си робот.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      captchaToken: captchaToken ?? undefined,
    })
    setLoading(false)

    if (error) {
      const msg = error.message.toLowerCase()
      if (error.code === 'captcha_failed' || msg.includes('captcha')) {
        setError('Проверката „не съм робот“ не успя. Опитай отново.')
      } else if (error.status === 429 || msg.includes('rate limit')) {
        setError('Твърде много опити. Изчакай малко и опитай пак.')
      } else {
        setError('Грешка при изпращане. Опитай отново.')
      }
      setCaptchaToken(null)
      setCaptchaReset(k => k + 1)
      return
    }
    // Не разкриваме дали имейлът съществува — винаги преминаваме към въвеждане на код
    setStep('reset')
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (code.length !== 8) { setError('Въведи всичките 8 цифри от кода.'); return }
    if (password.length < 8) { setError('Паролата трябва да е поне 8 символа.'); return }
    if (password !== confirm) { setError('Паролите не съвпадат.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
    if (otpError) {
      setError('Кодът е грешен или е изтекъл.')
      setLoading(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message.toLowerCase().includes('different')
        ? 'Новата парола трябва да е различна от старата.'
        : 'Грешка при смяна на паролата. Опитай отново.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>🔑</div>
          <h1 className="text-2xl font-black">Забравена парола</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {step === 'email' ? 'Ще ти изпратим код на имейла' : `Изпратихме код на ${email}`}
          </p>
        </div>

        <form onSubmit={step === 'email' ? sendCode : resetPassword}
          className="rounded-2xl border p-8 space-y-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {step === 'email' ? (
            <>
              <div>
                <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Имейл</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                  placeholder="you@example.com" />
              </div>
              <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} resetKey={captchaReset} />
              <button type="submit" disabled={loading || (captchaRequired && !captchaToken)}
                className="w-full py-3 rounded-lg text-sm font-bold"
                style={{ background: 'var(--accent)', color: '#fff', opacity: (loading || (captchaRequired && !captchaToken)) ? 0.7 : 1 }}>
                {loading ? 'Изпращане...' : 'Изпрати код'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm block mb-2 text-center" style={{ color: 'var(--muted)' }}>Код от имейла</label>
                <OtpInput value={code} onChange={setCode} length={8} />
              </div>
              <div>
                <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Нова парола</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Поне 8 символа" />
              </div>
              <div>
                <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Повтори паролата</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold"
                style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Запазване...' : 'Смени паролата и влез'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="w-full text-xs" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Не получи код? Опитай отново
              </button>
            </>
          )}

          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/login" style={{ color: 'var(--accent)' }} className="font-semibold">← Обратно към вход</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
