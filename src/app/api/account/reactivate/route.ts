import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called right after a successful login — if the account was temporarily
// closed, being able to log in again automatically brings everything back.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('is_deactivated')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_deactivated) {
    return NextResponse.json({ reactivated: false })
  }

  await admin.from('profiles').update({
    is_deactivated: false,
    deactivated_at: null,
  }).eq('id', user.id)

  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (shop) {
    await admin.from('shops').update({ is_active: true }).eq('id', shop.id)
  }

  return NextResponse.json({ reactivated: true })
}
