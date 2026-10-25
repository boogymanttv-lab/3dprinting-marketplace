'use client'

import { useState } from 'react'

interface Props { allCount: number; sellersCount: number; buyersCount: number }

type AudienceKey = 'all' | 'sellers' | 'buyers'

export function EmailComposer({ allCount, sellersCount, buyersCount }: Props) {
  const [audience, setAudience] = useState<AudienceKey>('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const count = audience === 'all' ? allCount : audience === 'sellers' ? sellersCount : buyersCount
  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }

  async function send(target: 'test' | AudienceKey) {
    setResult(null)
    if (!subject.trim() || !message.trim()) {
      setResult({ ok: false, text: 'Попълни тема и съобщение.' })
      return
    }
    if (target !== 'test' && !confirm(`Да изпратя ли това съобщение на ${count} получатели? Действието е необратимо.`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, audience: target }),
      })
      const data = await res.json()
      if (!res.ok) setResult({ ok: false, text: data.error || 'Грешка при изпращане.' })
      else setResult({
        ok: data.failed === 0,
        text: `Изпратени: ${data.sent} от ${data.total}${data.failed ? ` · неуспешни: ${data.failed}` : ''}`,
      })
    } catch {
      setResult({ ok: false, text: 'Грешка при изпращане.' })
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4 max-w-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--muted)' }}>Получатели</label>
        <div className="flex gap-2 flex-wrap">
          {([
            ['all', `Всички (${allCount})`],
            ['sellers', `Само продавачи (${sellersCount})`],
            ['buyers', `Всички без магазини (${buyersCount})`],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setAudience(key)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: audience === key ? 'rgba(249,115,22,0.1)' : 'var(--bg2)',
                border: `1.5px solid ${audience === key ? 'var(--accent)' : 'var(--border)'}`,
                color: audience === key ? 'var(--accent)' : 'var(--muted)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--muted)' }}>Тема</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={150}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle} />
      </div>

      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--muted)' }}>Съобщение</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={9}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-y" style={inputStyle} />
      </div>

      {result && (
        <p className="text-xs rounded-lg px-3 py-2"
          style={{ background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: result.ok ? 'var(--green)' : '#f87171' }}>
          {result.text}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => send('test')} disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', opacity: loading ? 0.6 : 1 }}>
          Прати тест на мен
        </button>
        <button onClick={() => send(audience)} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Изпращане...' : `Изпрати на ${count}`}
        </button>
      </div>
    </div>
  )
}
