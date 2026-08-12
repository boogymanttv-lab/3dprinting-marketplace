import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Пълно, необратимо изтриване на поръчка от базата — само за super_admin
// (напр. дублирана/тестова/спам поръчка). Различно от статус "Отказана",
// което просто маркира поръчката, но я запазва.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
