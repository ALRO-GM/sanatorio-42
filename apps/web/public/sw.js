/* global self, caches, fetch, URL, Response */

// La caché de la web en el PC (`docs/rendimiento.md`, «Caché»): cada trozo de
// la web se guarda la primera vez que hace falta y desde entonces se sirve de
// aquí, sin preguntar a la red. No se baja nada por adelantado: solo lo que se
// usa.
//
// - `assets/`: llevan un hash en el nombre (si cambian, cambia el nombre), así
//   que lo guardado vale para siempre. Se quedan los `MAX_ASSETS` más recientes.
// - La portada: siempre de la red, para estrenar cada despliegue al momento;
//   sin red, la última guardada.
// - La API, los sonidos (que van por trozos, `Range`) y lo de otros sitios: ni
//   se tocan, van como siempre.

const ASSETS = 'peer4u-assets-v1'
const PAGES = 'peer4u-pages-v1'
const KEEP = [ASSETS, PAGES]
/** Tope de trozos guardados: con cada despliegue cambian unos cuantos. */
const MAX_ASSETS = 400

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => !KEEP.includes(name)).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/** Quita los más antiguos si hay más de `MAX_ASSETS` (las claves salen por orden de llegada). */
async function trim() {
  const cache = await caches.open(ASSETS)
  const keys = await cache.keys()

  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)),
  )
}

/** Un trozo con hash: de la caché si está; si no, de la red, y se guarda. */
async function asset(request) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(request)

  if (hit !== undefined) return hit

  const response = await fetch(request)

  if (response.ok) {
    await cache.put(request, response.clone())
    void trim()
  }

  return response
}

/** La portada: de la red y, si no hay, la última guardada. */
async function page(request) {
  const cache = await caches.open(PAGES)
  // Una portada por web: la de verdad y la demostración.
  const key = new URL(request.url).pathname.startsWith('/demo') ? '/demo/' : '/'

  try {
    const response = await fetch(request)

    if (response.ok) await cache.put(key, response.clone())

    return response
  } catch (error) {
    const saved = await cache.match(key)

    if (saved !== undefined) return saved

    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET' || request.headers.has('range')) return

  const url = new URL(request.url)

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (/^\/(demo\/)?assets\//.test(url.pathname)) {
    event.respondWith(asset(request))
  } else if (request.mode === 'navigate') {
    event.respondWith(page(request).catch(() => Response.error()))
  }
})
