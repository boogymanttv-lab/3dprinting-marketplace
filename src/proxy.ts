import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Каноничен домейн — тези дублиращи хостове (vercel.app, apex без www)
// се пренасочват (301) тук, за да няма дублирано съдържание в Google.
const CANONICAL_HOST = 'www.3dprintingbg.com'
const DUPLICATE_HOSTS = new Set([
  '3dprintingbg.com',
  '3dprinting-marketplace.vercel.app',
])

// Домейн заключване — публичният repo (Fiverr портфолио) не е лицензиран
// за деплойване на друг домейн. Ако някой клонира кода и го пусне другаде,
// вместо реалния сайт вижда блокираща страница. Локална разработка
// (localhost) винаги е позволена. Умишлено твърдо закодирано тук, а не в
// .env — иначе клонираният deploy просто ще си сложи свой env и ще мине.
function isLockedOutHost(host: string): boolean {
  if (host === CANONICAL_HOST || DUPLICATE_HOSTS.has(host)) return false
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return false
  return true
}

const BLOCK_HTML = `<!DOCTYPE html>
<html lang="bg">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Недостъпно</title>
  </head>
  <body style="font-family: sans-serif; background: #0f0f13; color: #f1f0f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px;">
    <div style="max-width: 440px;">
      <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
      <h1 style="font-size: 20px; margin-bottom: 10px;">Този код не е лицензиран за този домейн</h1>
      <p style="color: #8884a0; line-height: 1.5;">
        Този проект е публикуван като портфолио пример и не е лицензиран за
        деплойване на друг домейн. Живата версия е на
        <a href="https://www.3dprintingbg.com" style="color: #f97316;">3dprintingbg.com</a>.
      </p>
    </div>
  </body>
</html>`

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  if (DUPLICATE_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = CANONICAL_HOST
    url.protocol = 'https'
    return NextResponse.redirect(url, 301)
  }

  if (isLockedOutHost(host)) {
    return new NextResponse(BLOCK_HTML, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
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
