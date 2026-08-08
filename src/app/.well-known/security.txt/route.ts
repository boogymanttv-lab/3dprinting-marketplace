const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export async function GET() {
  const body = `Contact: mailto:wellecfx@gmail.com
Expires: 2027-08-08T00:00:00.000Z
Preferred-Languages: bg, en
Canonical: ${SITE_URL}/.well-known/security.txt
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
