/**
 * Vercel Serverless Function: config.js
 * Mengekspos konfigurasi publik Supabase ke frontend (URL + anon key).
 * URL: /api/config
 *
 * Aman diekspos: Supabase anon key didesain untuk dipakai di browser dan
 * dibatasi oleh Row Level Security (lihat db-schema.sql). Yang TIDAK boleh
 * pernah sampai ke frontend adalah SUPABASE_SERVICE_KEY (dipakai server-side
 * saja, di api/db.js).
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabaseUrl     = process.env.SUPABASE_URL?.trim() || null;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || null;
  // Kosong sampai GA_MEASUREMENT_ID diisi di Vercel — analytics baru aktif
  // begitu ID-nya di-set, tidak ada tracking terpasang secara default.
  const gaMeasurementId = process.env.GA_MEASUREMENT_ID?.trim() || null;
  // Kunci publik VAPID buat PushManager.subscribe() di browser — aman
  // diekspos (itu memang fungsinya), kebalikan dari VAPID_PRIVATE_KEY yang
  // cuma dipakai server-side di lib/webPush.js.
  const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY?.trim() || null;

  return res.status(200).json({
    supabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    gaMeasurementId,
    vapidPublicKey,
  });
};
