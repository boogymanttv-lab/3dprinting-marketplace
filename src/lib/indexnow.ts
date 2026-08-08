// IndexNow — моментално известява Bing/Yandex за нови или променени страници,
// вместо да чакаме следващото планово обхождане на sitemap-а.
// https://www.indexnow.org/

const INDEXNOW_KEY = '61ddc33f7e56330fc0930120c7e56cb0'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'
const HOST = new URL(SITE_URL).host

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    })
  } catch {
    // Best-effort — не искаме да чупим потребителския поток заради IndexNow.
  }
}
