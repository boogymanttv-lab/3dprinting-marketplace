import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// Пълно, необратимо изтриване на потребителски акаунт от главния админ —
// отказва Stripe абонамента и изтрива Stripe клиента (ако има магазин),
// после трие auth потребителя. Каскадно (по FK правилата в базата) се
// трият: профил -> магазин -> обяви -> поръчки/ревюта/съобщения/любими.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (id === user.id) return NextResponse.json({ error: 'Не можеш да изтриеш собствения си акаунт оттук.' }, { status: 400 })

  const admin = createAdminClient()

  try {
    const { data: shop } = await admin
      .from('shops')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('owner_id', id)
      .maybeSingle()

    if (shop?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(shop.stripe_subscription_id)
      } catch (err) {
        console.error('[admin/users/delete] failed to cancel subscription', err)
      }
    }

    if (shop?.stripe_customer_id) {
      try {
        await stripe.customers.del(shop.stripe_customer_id)
      } catch (err) {
        console.error('[admin/users/delete] failed to delete Stripe customer', err)
      }
    }

    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) {
      console.error('[admin/users/delete] failed to delete user', error)
      return NextResponse.json({ error: 'Грешка при изтриване на акаунта.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/users/delete] unexpected error', err)
    return NextResponse.json({ error: 'Грешка при изтриване на акаунта.' }, { status: 500 })
  }
}
