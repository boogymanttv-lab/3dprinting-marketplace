import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Създаване на промо линк (само super_admin)
export async function POST(request: Request) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => null)
  const planId = String(b?.plan_id ?? '')
  const days = parseInt(b?.days, 10)
  if (!planId || planId === 'free') return NextResponse.json({ error: 'Избери платен план.' }, { status: 400 })
  if (!days || days < 1 || days > 365) return NextResponse.json({ error: 'Дните трябва да са между 1 и 365.' }, { status: 400 })

  const maxUses = b?.max_uses ? parseInt(b.max_uses, 10) : null
  const validUntil = b?.valid_until ? new Date(b.valid_until + 'T23:59:59') : null
  const code = (String(b?.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')) || randomCode()

  const admin = createAdminClient()
  const { data: plan } = await admin.from('plans').select('id').eq('id', planId).maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Няма такъв план.' }, { status: 400 })

  const { error } = await admin.from('promo_links').insert({
    code, plan_id: planId, days,
    max_uses: maxUses && maxUses > 0 ? maxUses : null,
    valid_until: validUntil && !isNaN(validUntil.getTime()) ? validUntil.toISOString() : null,
    note: b?.note ? String(b.note).slice(0, 120) : null,
  })
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'Такъв код вече съществува.' : error.message }, { status: 400 })
  }
  return NextResponse.json({ code })
}

// Включване/изключване на линк
export async function PATCH(request: Request) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('promo_links').update({ is_active: !!b.is_active }).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
