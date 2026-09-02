// Service worker mínimo para Bolsillo (PWA).
// Solo cachea estáticos del MISMO origen. Nunca cachea la API (Supabase/Google)
// ni respuestas de otro origen, para no dejar datos financieros en el caché del navegador.
const CACHE = 'bolsillo-v2'
const APP_SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  // Navegación: red primero, cae al shell si no hay conexión.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Solo el mismo origen se cachea; la API y todo lo externo pasa directo a la red.
  const sameOrigin = new URL(request.url).origin === self.location.origin
  if (!sameOrigin) return

  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
    )
  )
})
