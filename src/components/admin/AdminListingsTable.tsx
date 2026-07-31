'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flag, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { UserRole } from '@/types'

export interface AdminListingRow {
  id: string
  title: string
  price: number
  currency: string
  is_active: boolean
  moderation_status: 'active' | 'flagged'
  moderation_note: string | null
  shop_name: string
  shop_slug: string
  category_name: string | null
  created_at: string
}

export function AdminListingsTable({ listings, viewerRole }: { listings: AdminListingRow[]; viewerRole: UserRole }) {
  const router = useRouter()
  const [flagModalId, setFlagModalId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const canEdit = viewerRole === 'operator' || viewerRole === 'super_admin'

  async function submitFlag() {
    if (!flagModalId || !note.trim()) return
    setLoadingId(flagModalId)
    await fetch(`/api/admin/listings/${flagModalId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setLoadingId(null)
    setFlagModalId(null)
    setNote('')
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Изтриване завинаги на тази обява?')) return
    setLoadingId(id)
    await fetch(`/api/admin/listings/${id}/delete`, { method: 'POST' })
    setLoadingId(null)
    router.refresh()
  }

  return (
    <>
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Обява', 'Магазин', 'Цена', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.title}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{l.category_name ?? '—'}</div>
                    {l.moderation_status === 'flagged' && l.moderation_note && (
                      <div className="text-xs mt-1" style={{ color: '#eab308' }}>⚠️ {l.moderation_note}</div>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{l.shop_name}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--accent)' }}>
                    {formatPrice(l.price, l.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {l.moderation_status === 'flagged' ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>За редакция</span>
                    ) : l.is_active ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Активна</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>Неактивна</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/listings/${l.id}`} target="_blank" title="Виж"
                        className="p-1.5 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
                        <ExternalLink size={14} />
                      </Link>
                      <button onClick={() => { setFlagModalId(l.id); setNote('') }} title="Върни за редакция"
                        disabled={loadingId === l.id}
                        className="p-1.5 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: 'none', cursor: 'pointer' }}>
                        <Flag size={14} />
                      </button>
                      {canEdit && (
                        <>
                          <Link href={`/admin/listings/${l.id}/edit`} title="Редактирай"
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                            <Pencil size={14} />
                          </Link>
                          <button onClick={() => handleDelete(l.id)} title="Изтрий"
                            disabled={loadingId === l.id}
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {flagModalId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: '#eab308' }}>
              <Flag size={18} /> Върни за редакция
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
              Обявата ще бъде скрита от сайта и продавачът ще получи имейл с причината.
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="напр. Снимките не отговарят на продукта..."
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none mb-4"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setFlagModalId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
                Отказ
              </button>
              <button onClick={submitFlag} disabled={!note.trim() || loadingId === flagModalId}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#eab308', color: '#000', border: 'none', cursor: 'pointer', opacity: !note.trim() ? 0.5 : 1 }}>
                {loadingId === flagModalId ? 'Изпращане...' : 'Върни за редакция'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
