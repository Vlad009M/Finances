const CACHE_NAME = 'aperio-v1'
const OFFLINE_URL = '/offline.html'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/Aperio.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
]

// Встановлення — кешуємо статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Активація — очищаємо старі кеші
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. ПРОПУСКАЄМО ВСІ POST, PUT, DELETE запити (браузер виконає їх стандартно)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Пропускаємо не-http схеми (chrome-extension тощо)
  if (!url.protocol.startsWith('http')) return

  // 3. API запити — тільки мережа, без кешування
  if (url.pathname.startsWith('/api/') || url.hostname.includes('onrender.com') || url.hostname.includes('aperio.pp.ua')) {
    event.respondWith(fetch(request))
    return
  }
  // Навігація (HTML) — Network First, при помилці офлайн сторінка
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Статичні ресурси — Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => cached)
    })
  )
})