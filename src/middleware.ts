import { NextResponse, type NextRequest } from 'next/server'
import { ALLOWED_HOSTS } from '@/lib/site-lock'

// Блокира целия сайт, ако не работи на разрешен production домейн.
// Локална разработка (localhost/127.0.0.1) е винаги позволена, за да не
// пречи на нормалната работа по кода. Виж src/lib/site-lock.ts за списъка
// с разрешени домейни и обяснение защо е твърдо закодиран.
export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? ''
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  const isAllowed = ALLOWED_HOSTS.includes(host) || isLocal

  if (isAllowed) return NextResponse.next()

  return new NextResponse(
    `<!DOCTYPE html>
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
    </html>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
