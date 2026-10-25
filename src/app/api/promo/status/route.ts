import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePromo } from '@/lib/promo'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ promo: null })

  const promo = await getActivePromo(createAdminClient(), user.id)
  return NextResponse.json({ promo })
}
