// 3DPrintingBG — минимален service worker.
// Целта е инсталируемост (PWA/Play Store изисквания) + offline fallback,
// БЕЗ да кешираме динамични данни (цени/наличности/поръчки трябва винаги
// да идват свежи от мрежата). Кешираме само статичната обвивка.

const CACHE_NAME = '3dprintingbg-shell-v1'
const OFFLINE_URL = '/offline'
const SHELL_ASSETS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  // Navigation requests (page loads) — мрежа първо, offline страница при провал.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Статичните икони — cache-first (не се променят).
  if (SHELL_ASSETS.includes(new URL(request.url).pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request))
    )
  }
})
