import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Каноничен домейн — тези дублиращи хостове (vercel.app, apex без www)
// се пренасочват (301) тук, за да няма дублирано съдържание в Google.
const CANONICAL_HOST = 'www.3dprintingbg.com'
const DUPLICATE_HOSTS = new Set([
  '3dprintingbg.com',
  '3dprinting-marketplace.vercel.app',
])

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  if (DUPLICATE_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = CANONICAL_HOST
    url.protocol = 'https'
    return NextResponse.redirect(url, 301)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard', '/open-shop']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
