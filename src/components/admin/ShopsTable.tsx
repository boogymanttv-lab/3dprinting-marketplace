'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface AdminShopRow {
  id: string
  name: string
  slug: string
  city: string | null
  is_active: boolean
  plan_id: string
  billing_interval: 'monthly' | 'yearly' | null
  stripe_subscription_id: string | null
  total_sales: number
  created_at: string
  owner_email: string | null
}

export interface AdminPlanOption {
  id: string
  name: string
}

export function ShopsTable({ shops, plans, isSuperAdmin }: {
  shops: AdminShopRow[]; plans: AdminPlanOption[]; isSuperAdmin: boolean
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function changePlan(shopId: string, planId: string) {
    setLoadingId(shopId)
    await fetch(`/api/admin/shops/${shopId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    })
    setLoadingId(null)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Магазин', 'Собственик', 'План', 'Град', 'Статус', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shops.map(shop => (
              <tr key={shop.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-semibold">{shop.name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{shop.owner_email ?? '—'}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={shop.plan_id}
                        disabled={loadingId === shop.id}
                        onChange={e => changePlan(shop.id, e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg outline-none"
                        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {!shop.stripe_subscription_id && shop.plan_id !== 'free' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                          title="Планът е зададен ръчно от админ, без Stripe плащане">
                          🎁 ръчно
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>{shop.plan_id}</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{shop.city ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: shop.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: shop.is_active ? '#22c55e' : '#f87171',
                    }}>
                    {shop.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/stores/${shop.slug}`} target="_blank"
                    className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    Виж →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
