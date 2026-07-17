/**
 * Vercel Serverless Function: cron-purge-ktp.js
 * URL: /api/cron-purge-ktp — dipanggil otomatis oleh Vercel Cron (lihat
 * "crons" di vercel.json), sekali sehari jam 03:00 UTC.
 *
 * Kebijakan retensi data (UU PDP): foto KTP yang statusnya 'rejected' dan
 * sudah tidak disentuh selama RETENTION_DAYS hari dihapus permanen dari
 * database (kolom ktp_url dikosongkan). Status 'rejected' TETAP dijaga
 * (jadi pengguna masih lihat "Ditolak — unggah ulang"), yang dihapus cuma
 * file foto lamanya — bukan seluruh baris/akun.
 *
 * CARA SETUP (wajib, kalau belum):
 * Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan:
 *   CRON_SECRET = string acak apa saja (mis. hasil generate password manager)
 * Vercel otomatis mengirim header Authorization: Bearer <CRON_SECRET> setiap
 * memanggil endpoint ini lewat jadwal cron — tanpa header yang cocok,
 * request ditolak (supaya orang lain tidak bisa memicu penghapusan massal
 * dengan curl ke endpoint ini).
 */
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const CRON_SECRET  = process.env.CRON_SECRET?.trim();
const RETENTION_DAYS = 30;

async function sb(pathAndQuery, method, bodyObj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
    },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  if (!CRON_SECRET) return res.status(500).json({ error: 'CRON_SECRET belum diset di Vercel Environment Variables.' });
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [u, p] = await Promise.all([
      sb(`users?ktp_status=eq.rejected&updated_at=lt.${encodeURIComponent(cutoff)}&ktp_url=not.is.null`, 'PATCH', { ktp_url: null }),
      sb(`patient_profiles?ktp_status=eq.rejected&updated_at=lt.${encodeURIComponent(cutoff)}&ktp_url=not.is.null`, 'PATCH', { ktp_url: null }),
    ]);
    return res.status(200).json({
      success: true,
      usersPurged: Array.isArray(u.data) ? u.data.length : 0,
      patientProfilesPurged: Array.isArray(p.data) ? p.data.length : 0,
    });
  } catch (err) {
    console.error('[cron-purge-ktp]', err);
    return res.status(500).json({ error: err.message });
  }
};
