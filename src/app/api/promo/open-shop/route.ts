import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePromo } from '@/lib/promo'
import { slugify } from '@/lib/utils'

// Създава магазин с промо план (без Stripe) за определен брой дни.
// Когато периодът изтече, cron-ът /api/cron/expire-plans връща магазина на Free.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const promo = await getActivePromo(admin, user.id)
  if (!promo) return NextResponse.json({ error: 'Нямаш активно промо.' }, { status: 400 })

  const { data: existing } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Вече имаш магазин.' }, { status: 400 })

  const f = await request.json().catch(() => null)
  const name = String(f?.name ?? '').trim()
  const city = String(f?.city ?? '').trim()
  const phone = String(f?.phone ?? '').trim()
  if (!name || !city || !phone) return NextResponse.json({ error: 'Попълни име, град и телефон.' }, { status: 400 })

  const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)
  const startsAt = new Date()
  const expiresAt = new Date(startsAt.getTime() + promo.days * 24 * 60 * 60 * 1000)

  const { error } = await admin.from('shops').insert({
    owner_id: user.id,
    name,
    slug,
    description: f?.description || null,
    city,
    phone,
    company_name: f?.company_name || null,
    eik: f?.eik || null,
    vat_number: f?.vat_number || null,
    company_address: f?.company_address || null,
    plan_id: promo.planId,
    plan_starts_at: startsAt.toISOString(),
    plan_expires_at: expiresAt.toISOString(),
  })
  if (error) return NextResponse.json({ error: 'Грешка при създаването на магазина.' }, { status: 500 })

  await admin.from('promo_claims').update({ redeemed_at: new Date().toISOString() }).eq('user_id', user.id)
  return NextResponse.json({ slug })
}
