const CACHE = 'meleck-shell-v1'
self.addEventListener('install', (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(['/', '/manifest.webmanifest', '/icon.svg'])
      await self.skipWaiting()
    })(),
  ),
)
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('meleck-shell-') && key !== CACHE)
          await caches.delete(key)
      await self.clients.claim()
    })(),
  ),
)
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.urls))
    return
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.allSettled(
        event.data.urls
          .filter((url) => {
            try {
              const u = new URL(url)
              return (
                u.origin === self.location.origin &&
                (u.pathname.startsWith('/assets/') ||
                  u.pathname.startsWith('/fonts/'))
              )
            } catch {
              return false
            }
          })
          .map(async (url) => {
            const r = await fetch(url)
            if (r.ok) await cache.put(url, r)
          }),
      )
    })(),
  )
})
self.addEventListener('fetch', (event) => {
  const r = event.request,
    u = new URL(r.url)
  if (
    r.method !== 'GET' ||
    u.origin !== self.location.origin ||
    u.pathname.startsWith('/api/') ||
    u.pathname.startsWith('/.netlify/') ||
    u.pathname.startsWith('/data/')
  )
    return
  if (r.mode === 'navigate' && u.pathname === '/') {
    event.respondWith(
      fetch(r).catch(async () => {
        const cached = await caches.match('/')
        return (
          cached ||
          new Response(
            'Ouvrez d’abord l’application avec une connexion Internet.',
            {
              status: 503,
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            },
          )
        )
      }),
    )
    return
  }
  if (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/fonts/'))
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(r)
        if (cached) return cached
        const response = await fetch(r)
        if (response.ok) await cache.put(r, response.clone())
        return response
      })(),
    )
})
