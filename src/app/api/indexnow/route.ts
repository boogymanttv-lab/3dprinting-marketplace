import { NextResponse } from 'next/server'
import { pingIndexNow } from '@/lib/indexnow'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u: unknown) => typeof u === 'string') : []

  if (urls.length === 0) {
    return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
  }

  // Fire-and-forget — не караме клиента да чака отговора от IndexNow.
  pingIndexNow(urls)

  return NextResponse.json({ success: true })
}
