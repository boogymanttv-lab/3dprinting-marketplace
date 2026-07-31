import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  await admin.from('profiles').update({
    is_deactivated: true,
    deactivated_at: new Date().toISOString(),
  }).eq('id', user.id)

  // Hide shop + all its listings from the public site while deactivated
  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (shop) {
    await admin.from('shops').update({ is_active: false }).eq('id', shop.id)
  }

  return NextResponse.json({ success: true })
}
