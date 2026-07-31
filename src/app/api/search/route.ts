import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 3) return NextResponse.json([])

  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, currency, images, shop:shops!inner(name, is_active)')
    .eq('is_active', true)
    .eq('shop.is_active', true)
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .ilike('name', `%${q}%`)
    .is('parent_id', null)
    .limit(3)

  return NextResponse.json({
    listings: listings ?? [],
    categories: categories ?? [],
  })
}
