// =========================================================
// Akemat Foundation — Service Worker (PWA)
// Versi: 1.0.0
// =========================================================

const CACHE_NAME = 'akemat-v1';
const CACHE_VERSION = '1.0.0';

// File yang di-cache untuk offline pertama kali dibuka
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/data.js',
  '/js/app.js',
  '/manifest.json',
  // Font Google (di-cache setelah pertama kali dimuat)
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Work+Sans:wght@400;500;600&display=swap',
];

// ── Install: cache semua aset statis ─────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Akemat Foundation v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Beberapa aset gagal di-cache:', err);
      });
    }).then(() => {
      // Langsung aktif tanpa menunggu tab lama tutup
      return self.skipWaiting();
    })
  );
});

// ── Activate: hapus cache lama ────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first untuk aset statis, Network-first untuk API ─
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Lewati request non-GET
  if (event.request.method !== 'GET') return;

  // Lewati Netlify Functions (API calls selalu ke network)
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Lewati request ke domain lain yang bukan font Google
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit — kembalikan cache, update di background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // Jika network error, pakai cache
        return cachedResponse; // Langsung return cache (stale-while-revalidate)
      }

      // Cache miss — fetch dari network, lalu cache
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback: kembalikan index.html untuk navigasi
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ── Background Sync (opsional) ────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    console.log('[SW] Background sync: bookings');
  }
});

// ── Push Notifications (opsional, aktifkan jika perlu) ───────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Ada notifikasi baru dari Akemat Foundation.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Akemat Foundation',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
