import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Подаряване на кредити по имейл (само super_admin)
export async function POST(request: Request) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => null)
  const email = String(b?.email ?? '').trim().toLowerCase()
  const amount = parseInt(b?.amount, 10)
  const note = String(b?.note ?? '').trim().slice(0, 120)
  if (!email || !amount || amount < 1 || amount > 1000000) {
    return NextResponse.json({ error: 'Невалиден имейл или сума.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Няма потребител с този имейл.' }, { status: 404 })

  const { error } = await admin.rpc('add_credits', {
    p_user: profile.id, p_amount: amount, p_type: 'admin_grant',
    p_desc: note ? `Подарък: ${note}` : 'Подарени кредити',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
