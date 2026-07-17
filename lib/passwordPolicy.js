/**
 * lib/passwordPolicy.js — aturan kekuatan password, dicek otoritatif di
 * server (cermin dari passwordStrengthError di js/app.js — validasi
 * klien cuma untuk UX cepat, ini yang sebenarnya menentukan).
 */
function passwordPolicyError(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'Password minimal 8 karakter.';
  if (/^\d+$/.test(s)) return 'Password tidak boleh cuma angka.';
  if (/^(.)\1+$/.test(s)) return 'Password tidak boleh karakter yang sama berulang.';
  return null;
}

module.exports = { passwordPolicyError };
