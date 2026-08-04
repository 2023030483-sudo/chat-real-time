const CACHE_NAME = 'chat-aula-pwa-v1'

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/apple-touch-icon.png',
]

const CACHEABLE_DESTINATIONS = new Set([
  'style',
  'script',
  'image',
  'font',
  'manifest',
])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  // Firebase y cualquier servicio externo siguen trabajando directamente
  // contra la red; el service worker solo administra archivos de Netlify.
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (
    CACHEABLE_DESTINATIONS.has(request.destination) ||
    requestUrl.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put('/index.html', response.clone())
    }

    return response
  } catch {
    return (
      (await caches.match('/index.html')) ||
      (await caches.match('/')) ||
      Response.error()
    )
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
      }

      return response
    })
    .catch(() => undefined)

  return cachedResponse || (await networkResponsePromise) || Response.error()
}