import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Каноничен домейн — само тези конкретни дублиращи хостове се пренасочват (301),
// за да няма дублирано съдържание в Google. Не пипаме preview deployment-ите
// (те вече получават noindex автоматично от Vercel).
const CANONICAL_HOST = 'www.3dprintingbg.com'
const DUPLICATE_HOSTS = new Set([
  '3dprintingbg.com',
  '3dprinting-marketplace.vercel.app',
])

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  if (DUPLICATE_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = CANONICAL_HOST
    url.protocol = 'https'
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Пропускаме статичните файлове и вътрешните Next.js пътища,
     * за да не товарим middleware-а излишно.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
