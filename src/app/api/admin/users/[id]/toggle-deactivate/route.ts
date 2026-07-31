import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'operator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (id === user.id) return NextResponse.json({ error: 'Не можеш да деактивираш себе си оттук.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_deactivated').eq('id', id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const nextState = !profile.is_deactivated

  await admin.from('profiles').update({
    is_deactivated: nextState,
    deactivated_at: nextState ? new Date().toISOString() : null,
  }).eq('id', id)

  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', id).maybeSingle()
  if (shop) {
    await admin.from('shops').update({ is_active: !nextState }).eq('id', shop.id)
  }

  return NextResponse.json({ success: true, deactivated: nextState })
}
