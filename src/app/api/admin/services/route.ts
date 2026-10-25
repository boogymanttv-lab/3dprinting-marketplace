import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireSuperAdmin() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (role !== 'super_admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

// Промяна на цена / включване на услуга от каталога
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const b = await request.json().catch(() => null)
  if (!b?.code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (b.price_credits !== undefined) {
    const price = parseInt(b.price_credits, 10)
    if (!price || price < 1) return NextResponse.json({ error: 'Невалидна цена.' }, { status: 400 })
    patch.price_credits = price
  }
  if (b.is_active !== undefined) patch.is_active = !!b.is_active

  const admin = createAdminClient()
  const { error } = await admin.from('services').update(patch).eq('code', b.code)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Промяна на статус на поръчана услуга (реклама). При отказ → връщаме кредитите.
export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const b = await request.json().catch(() => null)
  const status = String(b?.status ?? '')
  if (!b?.id || !['in_progress', 'done', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: order } = await admin.from('service_orders').select('*').eq('id', b.id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.status === 'cancelled' || order.status === 'done') {
    return NextResponse.json({ error: 'Вече е приключена.' }, { status: 400 })
  }

  if (status === 'cancelled') {
    await admin.rpc('add_credits', {
      p_user: order.user_id, p_amount: order.price_credits, p_type: 'refund',
      p_desc: `Връщане: ${order.name}`,
    })
    // Ако е била промоция на обява — махаме я
    if (order.listing_id && order.kind !== 'ad') {
      await admin.from('listings').update({ promo_rank: 0, promo_until: null }).eq('id', order.listing_id)
    }
  }

  const patch: Record<string, unknown> = { status }
  if (status === 'in_progress') {
    patch.starts_at = new Date().toISOString()
    patch.ends_at = new Date(Date.now() + order.days * 86400000).toISOString()
  }
  const { error } = await admin.from('service_orders').update(patch).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
