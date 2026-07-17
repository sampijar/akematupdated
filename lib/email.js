/**
 * lib/email.js — kirim email transaksional lewat Resend API (REST langsung,
 * tanpa SDK tambahan — supaya tidak nambah dependency npm lagi).
 *
 * CARA SETUP:
 * 1. Daftar di https://resend.com (gratis, 3.000 email/bulan)
 * 2. Domains → Add Domain → akematfoundation.org → tambahkan DNS record
 *    (SPF/DKIM) yang diminta ke pengaturan DNS domain (mis. Hostinger).
 *    SEBELUM domain terverifikasi, Resend cuma izinkan kirim ke alamat
 *    email akun Resend sendiri (bukan ke pengguna asli) — normal, tunggu
 *    verifikasi domain selesai dulu.
 * 3. API Keys → Create API Key → di Vercel Dashboard → Project → Settings
 *    → Environment Variables: RESEND_API_KEY = re_xxxxx
 * 4. Push → Vercel auto-deploy
 *
 * Kosongkan RESEND_API_KEY untuk menonaktifkan email sepenuhnya (default,
 * gagal-diam — email transaksional adalah fitur tambahan, tidak boleh
 * sampai menggagalkan aksi utama seperti donasi/login hanya karena ini
 * belum di-setup atau sedang error).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const FROM = 'Akemat Foundation <notifikasi@akematfoundation.org>';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Bungkus konten email dengan header/footer bermerek Akemat yang konsisten,
// supaya tiap jenis email (tanda terima, peringatan login) tidak perlu
// menulis ulang layout HTML-nya sendiri.
function emailLayout(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:24px 16px;background:#FBF7F1;font-family:Arial,Helvetica,sans-serif;color:#20302A">
    <div style="max-width:480px;margin:0 auto">
      <div style="background:#1F4D3F;padding:18px 24px;border-radius:12px 12px 0 0">
        <span style="color:#fff;font-weight:800;font-size:1.05rem">Akemat Foundation</span>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #DDD3C4;border-top:none">
        ${bodyHtml}
      </div>
      <p style="text-align:center;font-size:.72rem;color:#50645C;margin-top:16px">Akemat Foundation · akematfoundation.org</p>
    </div>
  </body></html>`;
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!r.ok) console.error('[email] gagal kirim:', await r.text().catch(() => ''));
  } catch (err) {
    console.error('[email]', err);
  }
}

module.exports = { sendEmail, emailLayout, escapeHtml };
