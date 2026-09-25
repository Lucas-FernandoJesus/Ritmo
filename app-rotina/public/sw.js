const APP_URL = new URL('./', self.location.href)
const CACHE_PREFIX = `ritmo-${encodeURIComponent(APP_URL.pathname)}-`
const CACHE_NAME = `${CACHE_PREFIX}v5`
const CORE = [
  'manifest.webmanifest',
  'ritmo-mark.svg',
  'icon-ebony-192.png',
  'icon-ebony-512.png',
  'icon-ebony-maskable-512.png',
].map((path) => new URL(path, APP_URL).href)

function isAppResource(url) {
  return url.origin === APP_URL.origin && url.pathname.startsWith(APP_URL.pathname)
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(APP_URL.href)
    if (!response.ok) throw new Error('Não foi possível preparar o aplicativo para uso offline.')
    const html = await response.clone().text()
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
      .map((match) => new URL(match[1], APP_URL))
      .filter(isAppResource)
      .map((url) => url.href)
    if (!assets.some((url) => url.endsWith('.js')) || !assets.some((url) => url.endsWith('.css'))) throw new Error('Arquivos do aplicativo ausentes.')
    const media = []
    for (const styleUrl of assets.filter((url) => url.endsWith('.css'))) {
      const styleResponse = await fetch(styleUrl)
      if (!styleResponse.ok) throw new Error('Estilos do aplicativo ausentes.')
      const css = await styleResponse.text()
      for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const url = new URL(match[1], styleUrl)
        if (isAppResource(url)) media.push(url.href)
      }
    }
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll([...new Set([...CORE, ...assets, ...media])])
    await cache.put(APP_URL.href, response)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) =>
      (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      || (APP_URL.pathname === '/' && /^ritmo-v\d+$/.test(key)),
    ).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isAppResource(new URL(event.request.url))) return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(APP_URL.href, response.clone())
      }
      return response
    }).catch(() => caches.match(APP_URL.href)))
    return
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(event.request, response.clone())
    }
    return response
  })))
})
