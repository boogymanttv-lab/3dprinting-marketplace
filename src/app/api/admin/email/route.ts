import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBroadcast } from '@/lib/email'

export const maxDuration = 60

type Audience = 'all' | 'sellers' | 'buyers' | 'test'

// Масов имейл до регистрираните потребители — само super_admin.
export async function POST(request: Request) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const subject = String(body?.subject ?? '').trim()
  const message = String(body?.message ?? '').trim()
  const audience = body?.audience as Audience
  if (!subject || !message) return NextResponse.json({ error: 'Попълни тема и съобщение.' }, { status: 400 })
  if (!['all', 'sellers', 'buyers', 'test'].includes(audience)) return NextResponse.json({ error: 'Невалидна аудитория.' }, { status: 400 })

  const admin = createAdminClient()
  let recipients: string[] = []

  if (audience === 'test') {
    if (!user.email) return NextResponse.json({ error: 'Няма имейл.' }, { status: 400 })
    recipients = [user.email]
  } else {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email')
      .eq('is_deactivated', false)
      .not('email', 'is', null)

    let ids = new Set((profiles ?? []).map(p => p.id))
    if (audience === 'sellers' || audience === 'buyers') {
      const { data: shops } = await admin.from('shops').select('owner_id')
      const owners = new Set((shops ?? []).map(s => s.owner_id))
      ids = new Set([...ids].filter(id => (audience === 'sellers' ? owners.has(id) : !owners.has(id))))
    }
    recipients = [...new Set(
      (profiles ?? []).filter(p => ids.has(p.id) && p.email).map(p => p.email as string)
    )]
  }

  if (recipients.length === 0) return NextResponse.json({ error: 'Няма получатели.' }, { status: 400 })

  const result = await sendBroadcast(recipients, subject, message)
  return NextResponse.json({ ...result, total: recipients.length })
}
