/**
 * lib/webPush.js — kirim push notification lewat Web Push protocol
 * (library `web-push`, penandatanganan VAPID).
 *
 * CARA SETUP (wajib sebelum notifikasi bisa terkirim):
 * Di Vercel Dashboard → Project → Settings → Environment Variables:
 *   VAPID_PUBLIC_KEY  = (lihat pesan dari Claude / hasil generate)
 *   VAPID_PRIVATE_KEY = (JANGAN pernah sampai ke frontend/git)
 * VAPID_PUBLIC_KEY juga diekspos ke browser lewat api/config.js (aman,
 * memang didesain publik) — VAPID_PRIVATE_KEY cuma dipakai di sini.
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint.
 */
const webpush = require('web-push');

const SUPABASE_URL  = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY   = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY?.trim();
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim();

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:customercare@akematfoundation.org', VAPID_PUBLIC, VAPID_PRIVATE);
}

// Kirim ke SEMUA langganan aktif milik satu user_id (bisa lebih dari satu
// device). Gagal-diam kalau VAPID belum di-setup — notifikasi adalah fitur
// tambahan, tidak boleh sampai menggagalkan aksi utama (approve KTP, dst.)
// hanya karena env var belum diisi.
async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !SUPABASE_URL || !SERVICE_KEY || !userId) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=id,endpoint,p256dh,auth`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    const subs = await r.json().catch(() => []);
    if (!Array.isArray(subs) || !subs.length) return;
    const body = JSON.stringify(payload);
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      } catch (err) {
        // 404/410 = subscription sudah tidak berlaku (uninstall/logout browser dsb.) — bersihkan.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          }).catch(() => {});
        }
      }
    }));
  } catch (err) {
    console.error('[webPush]', err);
  }
}

module.exports = { sendPushToUser };
