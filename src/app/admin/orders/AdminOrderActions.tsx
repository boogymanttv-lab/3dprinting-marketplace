'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'

const STATUSES: OrderStatus[] = ['new', 'accepted', 'processing', 'shipped', 'completed', 'cancelled']

interface Props {
  orderId: string
  status: OrderStatus
  canDelete: boolean
}

export function AdminOrderActions({ orderId, status, canDelete }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function changeStatus(newStatus: string) {
    if (!newStatus || newStatus === status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) router.refresh()
      else alert('Грешка при смяна на статуса.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteOrder() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delete`, { method: 'POST' })
      if (res.ok) router.refresh()
      else alert('Грешка при триене на поръчката.')
    } finally {
      setLoading(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={loading}
        onChange={e => changeStatus(e.target.value)}
        className="text-xs rounded-lg px-2 py-1.5 outline-none"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
        ))}
      </select>

      {canDelete && (
        confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={deleteOrder}
              disabled={loading}
              className="text-xs px-2 py-1.5 rounded-lg font-bold"
              style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Сигурен?
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={loading}
              className="text-xs px-2 py-1.5 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={loading}
            title="Изтрий поръчката завинаги"
            className="text-xs px-2 py-1.5 rounded-lg"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', background: 'transparent', cursor: 'pointer' }}
          >
            🗑
          </button>
        )
      )}
    </div>
  )
}
