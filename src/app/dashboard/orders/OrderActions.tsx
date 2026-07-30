'use client'

import { useState } from 'react'
import type { OrderStatus } from '@/types'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new:        'accepted',
  accepted:   'processing',
  processing: 'shipped',
  shipped:    'completed',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  new:        '✓ Приеми',
  accepted:   '⚙️ Обработи',
  processing: '📦 Изпрати',
  shipped:    '🎉 Завърши',
}

interface Props {
  orderId: string
  status: OrderStatus
}

export function OrderActions({ orderId, status }: Props) {
  const [showTracking, setShowTracking] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')

  const next = NEXT_STATUS[status]
  const nextLabel = NEXT_LABEL[status]
  const isShipping = next === 'shipped'

  if (!next) return null

  return (
    <div className="flex flex-col gap-2">
      {/* Shipping step — needs tracking number */}
      {isShipping ? (
        showTracking ? (
          <form action={`/api/orders/${orderId}/status`} method="POST" className="space-y-2">
            <input type="hidden" name="status" value="shipped" />
            <input
              name="tracking_number"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="Номер на товарителница..."
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={{
                background: 'var(--bg2)',
                border: '1.5px solid var(--accent)',
                color: 'var(--text)',
                minWidth: '180px',
              }}
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                📦 Потвърди
              </button>
              <button
                type="button"
                onClick={() => setShowTracking(false)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowTracking(true)}
            className="text-xs px-4 py-2 rounded-lg font-bold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {nextLabel}
          </button>
        )
      ) : (
        /* All other steps — simple form submit */
        <form action={`/api/orders/${orderId}/status`} method="POST">
          <input type="hidden" name="status" value={next} />
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-lg font-bold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {nextLabel}
          </button>
        </form>
      )}

      {/* Cancel button — only for new/accepted/processing */}
      {(status === 'new' || status === 'accepted' || status === 'processing') && (
        <form action={`/api/orders/${orderId}/status`} method="POST">
          <input type="hidden" name="status" value="cancelled" />
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-lg font-semibold w-full"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', background: 'transparent', cursor: 'pointer' }}
          >
            Откажи
          </button>
        </form>
      )}
    </div>
  )
}
