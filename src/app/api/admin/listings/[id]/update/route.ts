import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'operator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()

  const update: Record<string, unknown> = {}
  const allowed = ['title', 'description', 'price', 'currency', 'quantity', 'condition', 'material', 'city', 'category_id', 'is_active'] as const
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Клиран флага при редакция от админ — обявата се смята за оправена
  update.moderation_status = 'active'
  update.moderation_note = null
  update.flagged_by = null
  update.flagged_at = null

  const { error } = await admin.from('listings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
