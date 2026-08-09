'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, type UserRole } from '@/types'
import { CheckCircle2, XCircle, PauseCircle, Trash2 } from 'lucide-react'

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_deactivated: boolean
  email_confirmed: boolean
  created_at: string
  has_shop: boolean
}

export function UsersTable({ users, viewerRole, viewerId }: { users: AdminUserRow[]; viewerRole: UserRole; viewerId: string }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const isSuperAdmin = viewerRole === 'super_admin'

  async function changeRole(userId: string, role: UserRole) {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setLoadingId(null)
    router.refresh()
  }

  async function toggleDeactivate(userId: string) {
    if (!confirm('Сигурен ли си?')) return
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}/toggle-deactivate`, { method: 'POST' })
    setLoadingId(null)
    router.refresh()
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Изтриваш ЗАВИНАГИ акаунта на ${email} — профил, магазин, обяви, поръчки, съобщения. Това е необратимо. Продължи ли?`)) return
    if (!confirm('Последно потвърждение — наистина ли искаш да изтриеш този акаунт необратимо?')) return
    setLoadingId(userId)
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: 'POST' })
    setLoadingId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Грешка при изтриване на акаунта.')
      return
    }
    router.refresh()
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Потребител', 'Имейл', 'Статус', 'Роля', 'Регистриран', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.full_name || '—'}</div>
                  {u.has_shop && <span className="text-xs" style={{ color: 'var(--accent)' }}>🏪 има магазин</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {u.email_confirmed
                      ? <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                      : <XCircle size={14} style={{ color: '#f87171' }} />}
                    <span style={{ color: 'var(--muted)' }}>{u.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.is_deactivated ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>
                      <PauseCircle size={12} /> Деактивиран
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                      Активен
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isSuperAdmin ? (
                    <select
                      value={u.role}
                      disabled={loadingId === u.id || u.id === viewerId}
                      onChange={e => changeRole(u.id, e.target.value as UserRole)}
                      className="text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{ROLE_LABELS[u.role]}</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('bg-BG')}
                </td>
                <td className="px-4 py-3">
                  {u.id !== viewerId && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleDeactivate(u.id)}
                        disabled={loadingId === u.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{
                          background: u.is_deactivated ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                          color: u.is_deactivated ? '#22c55e' : '#eab308',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        {u.is_deactivated ? 'Активирай' : 'Деактивирай'}
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          disabled={loadingId === u.id}
                          title="Изтрий завинаги"
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
