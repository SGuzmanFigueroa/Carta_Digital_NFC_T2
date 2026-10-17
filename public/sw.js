// Service Worker de GastroPulse: carta disponible sin conexión.
//
// Versión de la caché = versión del deploy. El layout registra este archivo como
// /sw.js?v=<commit>; en cada deploy cambia la URL, el navegador instala el SW
// nuevo y `activate` borra las cachés anteriores. Así un modelo 3D o una imagen
// que cambia con el mismo nombre no se queda viejo en los celulares.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `gastropulse-${VERSION}`;
const PRECACHE_URLS = ['/', '/menu', '/fonts/material-symbols-outlined.woff2', '/logo.png'];

// Recursos estáticos que se sirven desde caché (cache-first).
const STATIC_ASSET = /\.(?:glb|woff2|png|jpe?g|webp|avif|svg|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn('[SW] Precarga parcial:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

/** Solo se guardan respuestas públicas y completas del propio sitio. */
function isCacheable(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return false;
  const cacheControl = response.headers.get('Cache-Control') || '';
  return !/no-store|private/i.test(cacheControl) && !request.headers.has('Authorization');
}

function putInCache(request, response) {
  if (!isCacheable(request, response)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Otros sitios (Supabase, fuentes, CDN) y las API: siempre directo a la red.
  // Las respuestas de /api pueden ser privadas (reportes, personal) y nunca se guardan.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Imágenes, fuentes y modelos 3D: caché primero (la versión del deploy los renueva).
  if (STATIC_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              putInCache(request, response);
              return response;
            })
            .catch(() => new Response('Recurso no disponible sin conexión', { status: 503 }))
      )
    );
    return;
  }

  // Páginas y JS: red primero, caché como respaldo sin conexión.
  event.respondWith(
    fetch(request)
      .then((response) => {
        putInCache(request, response);
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (await caches.match('/menu')) || (await caches.match('/')) || Response.error();
        }
        return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
      })
  );
});
