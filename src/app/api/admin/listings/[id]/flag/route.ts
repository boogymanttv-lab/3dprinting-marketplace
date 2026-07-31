import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendListingFlagged } from '@/lib/email'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'moderator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const note = (body?.note as string | undefined)?.trim()
  if (!note) return NextResponse.json({ error: 'Въведи причина.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('id, title, shop:shops(name, owner:profiles(email, full_name))')
    .eq('id', id)
    .maybeSingle()

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin.from('listings').update({
    is_active: false,
    moderation_status: 'flagged',
    moderation_note: note,
    flagged_by: user.id,
    flagged_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shop = Array.isArray(listing.shop) ? listing.shop[0] : listing.shop
  const owner = shop ? (Array.isArray(shop.owner) ? shop.owner[0] : shop.owner) : null

  if (owner?.email) {
    try {
      await sendListingFlagged(owner.email, {
        ownerName: owner.full_name ?? 'Продавач',
        listingTitle: listing.title,
        note,
      })
    } catch {
      // Email failure shouldn't block the moderation action
    }
  }

  return NextResponse.json({ success: true })
}
