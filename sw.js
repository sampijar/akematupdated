// =========================================================
// Akemat Foundation — Service Worker (PWA)
// Versi: 2.0.0
// =========================================================

// NAIKKAN nomor ini setiap kali ada perubahan di js/*.js, css/*.css, atau
// index.html — ini satu-satunya cara memaksa pengguna PWA/TWA (terutama di
// HP, yang jarang hard-refresh) mengambil versi terbaru. Lupa menaikkan ini
// = pengguna lama bisa terjebak di versi lama tanpa batas waktu.
const CACHE_NAME = 'akemat-v6';

// File yang di-cache untuk offline pertama kali dibuka
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/payment-return.html',
  '/payment-cancel.html',
  '/css/style.css',
  '/js/data.js',
  '/js/api.js',
  '/js/payment.js',
  '/js/otp.js',
  '/js/app.js',
  '/manifest.json',
  // Font Google (di-cache setelah pertama kali dimuat)
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Work+Sans:wght@400;500;600&display=swap',
];

// Ekstensi yang aman di-cache-first (jarang berubah)
const CACHE_FIRST_EXT = /\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/i;

// ── Install: cache semua aset statis ─────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Akemat Foundation, cache ' + CACHE_NAME);
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

// ── Activate: hapus SEMUA cache dari versi lama ───────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ' + CACHE_NAME + '...');
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

// ── Fetch strategy ─────────────────────────────────────────
// Network-first untuk app shell (HTML/JS/CSS) — supaya perubahan kode
// SELALU diambil duluan saat online; cache hanya dipakai kalau offline.
// Cache-first HANYA untuk aset yang jarang berubah (gambar, font, ikon).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Lewati request non-GET
  if (event.request.method !== 'GET') return;

  // Lewati Netlify Functions / Vercel API — selalu ke network, jangan cache.
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Lewati request ke domain lain yang bukan font Google
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) {
    return;
  }

  const isStaticAsset = url.origin === location.origin && CACHE_FIRST_EXT.test(url.pathname);

  if (isStaticAsset) {
    // Cache-first untuk gambar/font/ikon
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first untuk app shell (HTML/JS/CSS/manifest)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === 'document') return caches.match('/index.html');
        })
      )
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
