'use strict';
// =========================================================
// Akemat Foundation v3 — SPA App
// =========================================================

// ── Analytics (GA4, opsional — nonaktif sampai GA_MEASUREMENT_ID diisi
// di Vercel Environment Variables; lihat api/config.js) ─────
let _gaId = null;
function loadAnalytics(id){
  if(!id || _gaId) return;
  _gaId = id;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', id, { send_page_view: false }); // page_view dikirim manual per navigasi SPA
}
function trackPageView(){
  if(!_gaId || typeof gtag !== 'function') return;
  gtag('event', 'page_view', { page_location: location.href, page_path: location.hash || '#home' });
}

// ── Persetujuan cookie (UU PDP) — GA4 baru dimuat SETELAH pengguna
// menyetujui, bukan otomatis begitu halaman dibuka. Keputusan disimpan di
// localStorage supaya tidak ditanya ulang tiap kunjungan; "Tolak" dihormati
// selamanya (tidak ada cara diam-diam mengaktifkan lagi).
const COOKIE_CONSENT_KEY = 'akemat_cookie_consent';
function initAnalyticsWithConsent(gaId){
  if(!gaId) return;
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if(consent === 'granted'){ loadAnalytics(gaId); return; }
  if(consent === 'denied') return;
  const banner = document.getElementById('cookie-consent');
  if(!banner) return;
  banner.classList.add('show');
  document.getElementById('btnCookieAccept')?.addEventListener('click', ()=>{
    localStorage.setItem(COOKIE_CONSENT_KEY, 'granted');
    banner.classList.remove('show');
    loadAnalytics(gaId);
  });
  document.getElementById('btnCookieDecline')?.addEventListener('click', ()=>{
    localStorage.setItem(COOKIE_CONSENT_KEY, 'denied');
    banner.classList.remove('show');
  });
}

// ── CAPTCHA (Cloudflare Turnstile) — login, kirim OTP registrasi, kirim
// OTP lupa-password. Site key aman ditaruh di frontend (bukan rahasia,
// cuma identitas widget); verifikasi sungguhan pakai secret key di server
// (lib/turnstile.js), token dari sini cuma "klaim", bukan bukti. ────────
const TURNSTILE_SITE_KEY = '0x4AAAAAAD37Bj3lBSYI7N5z';
function renderTurnstile(containerId, onToken){
  const el = document.getElementById(containerId);
  if(!el) return;
  (function tryRender(){
    if(window.turnstile?.render){
      window.turnstile.render('#'+containerId, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
        'expired-callback': ()=>onToken(''),
        'error-callback': ()=>onToken(''),
      });
    } else {
      setTimeout(tryRender, 200); // script Turnstile masih loading, coba lagi
    }
  })();
}

// ── Aturan kekuatan password ─────────────────────────────────
// Balikin pesan error (string) kalau password terlalu lemah, atau null
// kalau sudah cukup kuat. Dicek lagi otoritatif di server (Supabase Auth
// sendiri juga punya minimum length setting), ini lapisan UX + baseline.
function passwordStrengthError(pw){
  if(!pw || pw.length < 8) return 'Password minimal 8 karakter.';
  if(/^\d+$/.test(pw)) return 'Password tidak boleh cuma angka.';
  if(/^(.)\1+$/.test(pw)) return 'Password tidak boleh karakter yang sama berulang.';
  return null;
}

// ── Utility ────────────────────────────────────────────────
function rpFmt(n)     { return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }
function initials(name){ return (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function esc(s)       { return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ── Export CSV (dipakai panel admin) ────────────────────────
function csvEscape(val){
  const s = val===null||val===undefined ? '' : String(val);
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function downloadCsv(filename, headers, rows){
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(r=>lines.push(r.map(csvEscape).join(',')));
  // \uFEFF (BOM) supaya Excel baca sebagai UTF-8 dengan benar, bukan
  // salah tebak encoding lalu tampilkan karakter aneh untuk teks non-ASCII.
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── HTML building helpers (avoid nested template literals) ──
function optionHTML(val, label, selected){
  return '<option value="'+val+'"'+(selected?' selected':'')+'>'+label+'</option>';
}
function chipHTML(val, label, active){
  return '<button class="f-chip'+(active?' active':'')+'" data-cat="'+val+'">'+label+'</button>';
}

// ── Password field dengan tombol lihat/sembunyikan ──────────
const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// ── Ikon SVG bergaya konsisten (Feather-style, garis tipis) — dipakai
// menggantikan emoji di navigasi & badge yang paling sering dilihat
// pengguna, supaya tampilan lebih rapi/profesional di semua perangkat
// (emoji bisa tampil beda-beda tergantung OS/font, SVG selalu konsisten).
const ICON = {
  home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z"/></svg>',
  user:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5z"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 7 12 3 16 7"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
};
function helpLinkRow(icon, label, href, external){
  return '<a href="'+href+'"'+(external?' target="_blank" rel="noopener noreferrer"':'')+' class="help-link-row">'+
    '<span style="display:flex;align-items:center;gap:12px;font-size:.88rem"><span class="help-link-icon">'+icon+'</span>'+label+'</span>'+
    '<span class="help-link-chevron">'+ICON.chevronRight+'</span></a>';
}
// Bingkai foto KTP berukuran seragam mengikuti rasio KTP Indonesia asli
// (85,6mm × 53,98mm, sama seperti kartu ATM/kredit) — supaya foto KTP dari
// pengguna manapun (potret HP, scan, macam-macam rasio) tampil sama besar
// di dashboard, bukan besar-kecil sesuai foto aslinya. object-fit:contain
// (bukan cover) supaya seluruh isi KTP tetap terlihat utuh untuk verifikasi,
// tidak ada bagian yang terpotong.
function ktpThumb(url, opts){
  opts = opts || {};
  var cls = 'ktp-thumb' + (opts.lg ? ' ktp-thumb-lg' : '');
  var style = opts.style ? ' style="'+opts.style+'"' : '';
  if (!url) return opts.showEmpty ? '<div class="'+cls+' ktp-thumb-empty"'+style+'>Tidak ada foto</div>' : '';
  // onerror: kalau data foto ternyata rusak/gagal dimuat, tampilkan pesan
  // jelas di dalam bingkainya sendiri — daripada diam-diam jadi kotak
  // kosong yang bikin bingung apakah fotonya kesimpan atau tidak.
  return '<div class="'+cls+'"'+style+'><img src="'+esc(url)+'" alt="Foto KTP" loading="lazy" '+
    'onerror="this.closest(\'.ktp-thumb\').classList.add(\'ktp-thumb-empty\');this.replaceWith(Object.assign(document.createElement(\'span\'),{textContent:\'Gagal memuat foto — coba unggah ulang\'}))" />'+
    '</div>';
}
function pwFieldHTML(id, label, placeholder, autocomplete){
  return '<div class="ff"><label>'+label+'</label>'+
    '<div class="pw-field">'+
      '<input type="password" id="'+id+'" placeholder="'+placeholder+'" autocomplete="'+(autocomplete||'current-password')+'" />'+
      '<button type="button" class="pw-toggle" data-pw-toggle="'+id+'" aria-label="Lihat password">'+EYE_ICON+'</button>'+
    '</div></div>';
}
// Delegated sekali di init, aman dipanggil ulang tiap render (idempotent via addEventListener sekali di document).
function togglePwField(btn){
  var input = document.getElementById(btn.dataset.pwToggle);
  if(!input) return;
  var showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
  btn.setAttribute('aria-label', showing ? 'Lihat password' : 'Sembunyikan password');
}

// ── Helper: render pay button without nested template literals ──
function payBtnHTML(status, id){
  if(status==='pending' || status==='confirmed'){
    var lbl = status==='pending' ? '💳 Bayar' : '💳 Lunasi';
    return '<button class="btn btn-xs btn-accent" style="color:#1F4D3F;white-space:nowrap" data-pay="'+id+'">'+lbl+'</button>';
  }
  return '<span style="color:#9CA3AF">—</span>';
}

// ── Kompres foto campaign jadi data URL kecil di browser ────
// Tidak ada bucket storage terpisah — foto disimpan sebagai data URL di kolom
// image_url, jadi wajib dikecilkan dulu di sisi klien supaya row-nya tidak bengkak.
function fileToResizedDataUrl(file, maxDim=1000, quality=0.82){
  return new Promise((resolve, reject)=>{
    if(!file.type.startsWith('image/')){ reject(new Error('File harus berupa gambar.')); return; }
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error('Gagal membaca file.'));
    reader.onload = ()=>{
      img.onerror = ()=>reject(new Error('File gambar tidak valid.'));
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          const scale = maxDim / Math.max(w,h);
          w = Math.round(w*scale); h = Math.round(h*scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Getar singkat di aksi penting (booking berhasil, donasi berhasil, dst.)
// — sensasi taktil khas app native. iOS Safari tidak dukung Vibration API
// sama sekali, no-op aman kalau tidak ada.
function haptic(ms=15){ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch{} }

function toast(msg, type=''){
  const t = document.getElementById('toast');
  if(!t) return;
  if(type==='s') haptic(15); else if(type==='e') haptic([10,40,10]);
  t.textContent = msg;
  t.className = 'vis' + (type ? ' t'+type[0] : '');
  clearTimeout(t._t);
  // Cuma lepas 'vis' (posisi/visibilitas) saat sembunyi, JANGAN lepas kelas
  // warnanya (te/ts) — kalau semuanya di-reset sekaligus, warnanya balik ke
  // default (hijau tua) duluan sebelum animasi slide-out selesai, jadi
  // toast merah kelihatan "berubah jadi hijau" pas lagi turun.
  t._t = setTimeout(()=>{ t.classList.remove('vis'); }, 3500);
}

function daysLeft(dateStr){
  const d = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  return d > 0 ? d + ' hari lagi' : 'Berakhir';
}

function pct(current, target){ return Math.min(100, Math.round((current/target)*100)); }

const SPECIALTY_ICONS = {
  'Perawat Jiwa':          '🧠',
  'Perawat Anak & Bayi':   '👶',
  'Perawat Lansia':        '👴',
  'Perawat Medical Bedah': '🏥',
  'Perawat Luka':          '🩹',
  'Perawat Maternitas':    '🤱',
  'Perawat Paliatif':      '🕊️',
};

const SPECIALTY_COLORS = {
  'Perawat Jiwa':          'badge-purple',
  'Perawat Anak & Bayi':   'badge-blue',
  'Perawat Lansia':        'badge-amber',
  'Perawat Medical Bedah': 'badge-teal',
  'Perawat Luka':          'badge-rose',
  'Perawat Maternitas':    'badge-green',
  'Perawat Paliatif':      'badge-orange',
};

function specBadge(spec){
  return '<span class="badge '+(SPECIALTY_COLORS[spec]||'badge-blue')+'">'+(SPECIALTY_ICONS[spec]||'🩺')+' '+esc(spec)+'</span>';
}

const CAM_COLORS = {
  'Perawat Jiwa':'#7C3AED','Perawat Anak & Bayi':'#2563EB',
  'Perawat Lansia':'#D97706','Perawat Medical Bedah':'#0F766E',
  'Perawat Luka':'#DB2777','Perawat Maternitas':'#16A34A',
  'Perawat Paliatif':'#C2410C',
};

// Tarif minimum per jam — kebijakan platform, bukan validasi teknis:
// mencegah perawat pasang tarif sangat murah sebagai kedok buat menarik
// pasien lalu bertransaksi di luar aplikasi. Dicek juga di server
// (api/auth.js, api/db.js) supaya tidak bisa dilewati dari luar UI.
const MIN_NURSE_RATE = 100000;

// ── Routing ────────────────────────────────────────────────
const app = document.getElementById('app');

function navigate(hash){ location.hash = hash; }

// Arah transisi disimpulkan dari jumlah "segmen" hash, bukan history stack
// eksplisit (routing berbasis hash tidak natural buat dilacak stack) —
// list→detail nambah 1 segmen ("perawat" → "perawat/id") kerasa "masuk lebih
// dalam" jadi slide dari kanan; detail→list kerasa "keluar" jadi slide dari
// kiri; sesama level (mis. ganti tab bawah) tetap fade netral seperti biasa.
let _prevHashParts = null;

let _chatPollTimer = null;

// Halaman yang tidak dibutuhkan di initial load (auth, profil, admin, panel
// legal, chat, dst.) dipecah ke js/pages/*.js dan diambil belakangan lewat
// dynamic import() cuma saat rute-nya benar-benar dibuka — supaya beranda
// tidak ikut memuat/parse JS yang belum tentu dipakai pengunjung (temuan
// Lighthouse "unused JavaScript"). File-file itu memakai fungsi/variabel
// global dari app.js langsung (esc, Store, toast, dst.) lewat lexical scope
// realm yang sama — bukan lewat import — jadi tidak ada impor eksplisit di
// sana. Kalau importnya gagal (mis. lagi offline), tampilkan halaman error
// yang jelas alih-alih layar putih kosong.
async function lazyPage(path){
  try {
    return await import(path);
  } catch(e) {
    console.error('[lazyPage] Gagal memuat', path, e);
    app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
      '<div style="font-size:2.5rem;margin-bottom:10px">⚠️</div>'+
      '<h2>Gagal Memuat Halaman</h2>'+
      '<p style="color:var(--soft);margin:8px 0 20px">Periksa koneksi internet Anda, lalu coba lagi.</p>'+
      '<button class="btn btn-primary" onclick="location.reload()">Muat Ulang</button></div>';
    return new Proxy({}, { get: () => async () => {} });
  }
}

// Bar progres navigasi tipis di puncak layar (ala app native/YouTube) —
// baru benar-benar ditampilkan kalau perpindahan halaman makan waktu lebih
// dari sekejap (import chunk + fetch data), supaya navigasi instan (dari
// cache) tidak kedap-kedip tak perlu. Progres "merambat" mendekati 85% lalu
// nunggu, disentak ke 100% begitu render selesai.
const _routeProgressEl = document.getElementById('route-progress');
let _rpShowTimer = null, _rpTickTimer = null;
function startRouteProgress(){
  if(!_routeProgressEl) return;
  clearTimeout(_rpShowTimer); clearInterval(_rpTickTimer);
  _routeProgressEl.classList.remove('active');
  _routeProgressEl.style.width = '0%';
  _rpShowTimer = setTimeout(()=>{
    _routeProgressEl.classList.add('active');
    _routeProgressEl.style.width = '25%';
    _rpTickTimer = setInterval(()=>{
      const w = parseFloat(_routeProgressEl.style.width) || 0;
      if(w < 85) _routeProgressEl.style.width = (w + (85-w)*0.12).toFixed(1) + '%';
    }, 180);
  }, 120);
}
function finishRouteProgress(){
  if(!_routeProgressEl) return;
  clearTimeout(_rpShowTimer); clearInterval(_rpTickTimer);
  if(!_routeProgressEl.classList.contains('active')){ _routeProgressEl.style.width = '0%'; return; }
  _routeProgressEl.style.width = '100%';
  setTimeout(()=>{
    _routeProgressEl.classList.remove('active');
    setTimeout(()=>{ _routeProgressEl.style.width = '0%'; }, 200);
  }, 150);
}

async function route(){
  startRouteProgress();
  // Pindah halaman apa pun (termasuk keluar dari chat) — hentikan polling
  // pesan chat sebelumnya, supaya tidak terus jalan di background dan
  // nembak elemen DOM yang sudah tidak ada lagi.
  if(_chatPollTimer){ clearInterval(_chatPollTimer); _chatPollTimer = null; }
  const hash  = location.hash.replace('#','') || '';
  const parts = hash.split('/');
  const page  = parts[0];
  const id    = parts[1];

  let direction = 'fade';
  if(_prevHashParts && page === _prevHashParts[0]){
    if(parts.length > _prevHashParts.length) direction = 'forward';
    else if(parts.length < _prevHashParts.length) direction = 'back';
  }
  _prevHashParts = parts;

  renderHeader();
  renderMobileTabbar();
  switch(page){
    case '':         case 'home':    await renderHome();           break;
    case 'perawat': {
      const m = await lazyPage('/js/pages/nurse.js');
      id ? await m.renderNurseDetail(id) : await m.renderNurseList();
      break;
    }
    case 'donasi': {
      const m = await lazyPage('/js/pages/campaign.js');
      id ? await m.renderCampaignDetail(id) : await m.renderCampaignList();
      break;
    }
    case 'login': {
      const m = await lazyPage('/js/pages/auth.js');
      m.renderLogin();
      break;
    }
    case 'lupa-password': {
      const m = await lazyPage('/js/pages/auth.js');
      m.renderForgotPassword();
      break;
    }
    case 'register': {
      const m = await lazyPage('/js/pages/auth.js');
      m.renderRegister();
      break;
    }
    case 'dashboard':await renderDashboard();   break;
    case 'profil': {
      const m = await lazyPage('/js/pages/profile.js');
      await m.renderProfile();
      break;
    }
    case 'tnc': {
      const m = await lazyPage('/js/pages/legal.js');
      m.renderTNC();
      break;
    }
    case 'privasi': {
      const m = await lazyPage('/js/pages/legal.js');
      m.renderPrivacyPolicy();
      break;
    }
    case 'faq': {
      const m = await lazyPage('/js/pages/legal.js');
      m.renderFAQ();
      break;
    }
    case 'admin': {
      const m = await lazyPage('/js/pages/admin.js');
      await m.renderAdminDash();
      break;
    }
    case 'chat': {
      if(!id){ navigate('#dashboard'); break; }
      const m = await lazyPage('/js/pages/chat.js');
      await m.renderChat(id);
      break;
    }
    default:         await renderHome();
  }
  // Restart animasi tiap ganti halaman (class sudah ada = tidak replay
  // begitu saja, jadi dipaksa reflow di antara remove/add).
  app.classList.remove('page-transition','page-forward','page-back');
  void app.offsetWidth;
  app.classList.add(direction==='forward' ? 'page-forward' : direction==='back' ? 'page-back' : 'page-transition');
  window.scrollTo(0,0);
  trackPageView();
  finishRouteProgress();
}

window.addEventListener('hashchange', route);

// ── Header ─────────────────────────────────────────────────
function renderHeader(){
  const u = Store.getCurrentUser();
  const nav = document.getElementById('mainNav');
  if(!nav) return;
  nav.innerHTML = `
    <ul>
      <li><a href="#perawat" class="${location.hash.startsWith('#perawat')?'active':''}">Cari Perawat</a></li>
      <li><a href="#donasi" class="${location.hash.startsWith('#donasi')?'active':''}">Donasi</a></li>
      <li><a href="#faq">FAQ</a></li>
      <li><a href="#tnc">Syarat & Ketentuan</a></li>
    </ul>
    ${u
      ? '<div class="header-user"><div class="header-avatar">'+initials(u.name)+'</div><span class="header-name">'+esc(u.name.split(' ')[0])+'</span><a href="#dashboard" class="btn btn-sm btn-outline" style="padding:9px 20px">Dashboard</a></div>'
      : '<div style="display:flex;gap:8px"><a href="#login" class="btn btn-sm btn-outline" style="padding:7px 16px;font-size:.82rem">Masuk</a><a href="#register" class="btn btn-sm btn-accent" style="padding:7px 16px;font-size:.82rem;color:#1F4D3F">Daftar</a></div>'
    }
  `;

  // Search bar + avatar khusus header mobile (cuma tampil lewat CSS di
  // layar sempit — lihat @media 780px) supaya header tidak polos kosong
  // setelah nav penuh disembunyikan di HP.
  const searchRow = document.getElementById('headerSearchRow');
  if(searchRow){
    // Toggle: dari halaman Profil, tap avatar lagi balik ke Beranda —
    // dievaluasi tiap route() jalan (hash sudah update duluan sebelum
    // renderHeader dipanggil), jadi selalu cerminkan halaman saat ini.
    const onProfil = location.hash.startsWith('#profil');
    searchRow.innerHTML =
      '<a href="#perawat" class="header-search-btn">'+ICON.search+'<span>Cari perawat, layanan…</span></a>'+
      (u
        ? '<a href="'+(onProfil?'#home':'#profil')+'" class="header-avatar-btn" aria-label="'+(onProfil?'Beranda':'Profil saya')+'"><div class="header-avatar">'+initials(u.name)+'</div></a>'
        : '<a href="#login" class="header-avatar-btn" aria-label="Masuk"><div class="header-avatar">'+ICON.user+'</div></a>'
      );
  }
}

// ── Bottom tab bar (HP) — navigasi utama gaya app native ─────
function renderMobileTabbar(){
  const u = Store.getCurrentUser();
  const tb = document.getElementById('mobileTabbar');
  if(!tb) return;
  const h = location.hash || '#home';
  const isHome    = h==='' || h==='#' || h==='#home';
  const isPerawat = h.startsWith('#perawat');
  const isDonasi  = h.startsWith('#donasi');
  const isAccount = u ? h.startsWith('#dashboard')||h.startsWith('#profil') : (h.startsWith('#login')||h.startsWith('#register')||h.startsWith('#lupa-password'));
  tb.innerHTML =
    '<a href="#home" class="'+(isHome?'active':'')+'"><span class="mt-icon">'+ICON.home+'</span>Beranda</a>'+
    '<a href="#perawat" class="'+(isPerawat?'active':'')+'"><span class="mt-icon">'+ICON.search+'</span>Perawat</a>'+
    '<a href="#donasi" class="'+(isDonasi?'active':'')+'"><span class="mt-icon">'+ICON.heart+'</span>Donasi</a>'+
    (u
      ? '<a href="#dashboard" class="'+(isAccount?'active':'')+'"><span class="mt-icon">'+ICON.user+'</span>Akun</a>'
      : '<a href="#login" class="'+(isAccount?'active':'')+'"><span class="mt-icon">'+ICON.user+'</span>Masuk</a>');
}

// ── Home ───────────────────────────────────────────────────
// Grid ikon kecil ala menu Gojek (GoRide/GoFood/dst) — satu ikon = satu tujuan,
// tanpa judul besar/subtitle, biar padat dan cepat dipindai.
function quickTile(icon, label, color, href, spec){
  return '<a href="'+href+'"'+(spec?' data-spec="'+esc(spec)+'"':'')+' class="qt">'+
    '<span class="qt-icon" style="background:'+color+'26">'+icon+'</span>'+
    '<span class="qt-label">'+esc(label)+'</span>'+
  '</a>';
}
function specGridHTML(){
  const tiles = SPECIALTIES.map(s=>quickTile(SPECIALTY_ICONS[s], s.replace('Perawat ',''), CAM_COLORS[s]||'#1F4D3F', '#perawat', s));
  tiles.push(quickTile('❤️', 'Donasi', '#E8714A', '#donasi'));
  return tiles.join('');
}
function wireSpecGrid(){
  document.getElementById('specGrid')?.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-spec]');
    if(!card) return;
    sessionStorage.setItem('akemat_prefilter_spec', card.dataset.spec);
  });
}

async function renderHome(){
  const u = Store.getCurrentUser();
  const [nursesList, campaigns] = await Promise.all([Store.getNurses(), Store.getCampaigns()]);
  const nurses    = nursesList.length;
  const totalDon  = campaigns.reduce((s,c)=>s+c.current,0);

  // Sudah login = sudah "diyakinkan", tidak perlu hero/statistik/pitch marketing
  // lagi tiap buka Beranda — langsung ke sapaan singkat + jalan pintas, seperti
  // halaman utama aplikasi native (bukan halaman landing yang panjang).
  if(u){
    app.innerHTML = `
    <section class="home-greet">
      <div class="container">
        <p class="hg-hi">Halo, ${esc(u.name.split(' ')[0])} 👋</p>
        <h2 class="hg-q">Mau apa hari ini?</h2>
      </div>
    </section>
    <section class="pub-section" style="padding-top:8px">
      <div class="container">
        <div class="quick-grid" id="specGrid">${specGridHTML()}</div>
      </div>
    </section>
    <section class="pub-section alt">
      <div class="container">
        <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px">
          <div style="min-width:0">
            <p class="eyebrow">Campaign donasi aktif</p>
            <h2>Mereka membutuhkan bantuan Anda</h2>
          </div>
          <a href="#donasi" class="btn btn-ghost btn-sm">Lihat semua →</a>
        </div>
        <div class="campaign-grid">
          ${campaigns.slice(0,3).map(c=>campaignCard(c)).join('') || emptyState('Belum ada campaign aktif.')}
        </div>
      </div>
    </section>
    ${renderFooterSection()}`;
    wireSpecGrid();
    return;
  }

  const topReviews = await Store.getTopReviews(6).catch(()=>[]);

  app.innerHTML = `
  <!-- Hero -->
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <p class="eyebrow">Yayasan kemanusiaan · melayani sejak 2026</p>
        <h1>Perawat tepercaya, hadir di rumah karena kepedulian Anda</h1>
        <p class="lead">Akemat Foundation mempertemukan keluarga dengan perawat jiwa, lansia, maternitas, dan berbagai spesialisasi lainnya. Seluruh layanan didukung oleh donasi masyarakat.</p>
        <div class="hero-cta">
          <a href="#perawat" class="btn btn-primary">Cari Perawat</a>
          <a href="#donasi" class="btn btn-outline">Donasi Sekarang</a>
        </div>
      </div>
      <div class="hero-art">
        <svg viewBox="0 0 420 380" xmlns="http://www.w3.org/2000/svg">
          <circle cx="210" cy="195" r="175" fill="#E3EFE7"/>
          <polygon points="60,205 175,110 290,205" fill="#3A7363"/>
          <rect x="80" y="205" width="190" height="130" rx="8" fill="#1F4D3F"/>
          <rect x="195" y="245" width="48" height="90" rx="4" fill="#FBF7F1"/>
          <rect x="105" y="240" width="46" height="46" rx="4" fill="#F2A541"/>
          <line x1="128" y1="240" x2="128" y2="286" stroke="#1F4D3F" stroke-width="3"/>
          <line x1="105" y1="263" x2="151" y2="263" stroke="#1F4D3F" stroke-width="3"/>
          <circle cx="320" cy="210" r="24" fill="#E8714A"/>
          <rect x="300" y="238" width="40" height="78" rx="16" fill="#E8714A"/>
          <path d="M255 150c-5-7-17-2-9 9l9 9 9-9c8-11-4-16-9-9z" fill="#F2A541"/>
        </svg>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="stats-bar">
    <div class="container stats-grid">
      <div><span class="stat-num">500+</span><span class="stat-label">Keluarga terbantu</span></div>
      <div><span class="stat-num">${nurses}</span><span class="stat-label">Perawat bermitra</span></div>
      <div><span class="stat-num">28</span><span class="stat-label">Kota terjangkau</span></div>
      <div><span class="stat-num">${rpFmt(totalDon)}</span><span class="stat-label">Total donasi terkumpul</span></div>
    </div>
  </section>

  <!-- Role cards -->
  <section class="pub-section role-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Mulai di sini</p>
        <h2>Anda butuh apa hari ini?</h2>
      </div>
      <div class="role-grid">
        <div class="role-card" onclick="navigate('#perawat')">
          <div class="role-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg></div>
          <h3>Cari Perawat</h3>
          <p>Temukan perawat spesialis jiwa, lansia, luka, maternitas, dan lainnya yang siap datang ke rumah Anda.</p>
          <a href="#perawat" class="btn btn-primary btn-sm" style="margin-top:8px;align-self:flex-start">Cari sekarang →</a>
        </div>
        <div class="role-card rc-hl" onclick="navigate('#donasi')">
          <div class="role-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21s-7-4.35-9-9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c-1 4.5-7 9-7 9z"/></svg></div>
          <h3>Donasi Campaign</h3>
          <p>Bantu keluarga yang membutuhkan perawatan namun terkendala biaya. Setiap rupiah membuat perbedaan nyata.</p>
          <a href="#donasi" class="btn btn-accent btn-sm" style="margin-top:8px;align-self:flex-start">Donasi →</a>
        </div>
        <div class="role-card" onclick="navigate('#register')">
          <div class="role-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2.5-8 4v1h16v-1c0-1.5-3-4-8-4z"/></svg></div>
          <h3>Daftar Jadi Perawat</h3>
          <p>Bergabunglah sebagai mitra perawat. Anda menerima 80% dari setiap janji temu yang berhasil dilakukan.</p>
          <a href="#register" class="btn btn-outline btn-sm" style="margin-top:8px;align-self:flex-start">Daftar mitra →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Menu cepat -->
  <section class="pub-section alt">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Menu cepat</p>
        <h2>Semua yang Anda butuhkan</h2>
      </div>
      <div class="quick-grid" id="specGrid">${specGridHTML()}</div>
    </div>
  </section>

  <!-- Active campaigns preview -->
  <section class="pub-section">
    <div class="container">
      <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px">
        <div style="min-width:0">
          <p class="eyebrow">Campaign donasi aktif</p>
          <h2>Mereka membutuhkan bantuan Anda</h2>
        </div>
        <a href="#donasi" class="btn btn-ghost btn-sm">Lihat semua →</a>
      </div>
      <div class="campaign-grid">
        ${campaigns.slice(0,3).map(c=>campaignCard(c)).join('')}
      </div>
    </div>
  </section>

  ${testimonialsSection(topReviews)}

    ${renderFooterSection()}`;
  wireSpecGrid();
}

// Testimoni pengguna di Beranda (cuma tamu — pengguna yang sudah login
// dianggap sudah "diyakinkan", lihat komentar di atas renderHome). Kosong
// kalau belum ada ulasan bagus sama sekali — daripada tampilkan section
// testimoni yang kosong melompong.
function testimonialsSection(reviews){
  if (!reviews.length) return '';
  return `
  <section class="pub-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Kata mereka</p>
        <h2>Dipercaya keluarga di seluruh Indonesia</h2>
      </div>
      <div class="testimonial-grid">
        ${reviews.map(r=>`
        <div class="testimonial-card">
          <div class="t-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <p class="t-comment">&ldquo;${esc(r.comment)}&rdquo;</p>
          <p class="t-author">${esc(r.patientName || 'Pengguna Akemat')}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}


function skeletonGrid(gridClass, n){
  return '<div class="'+gridClass+'">'+Array(n).fill('<div class="skel skel-card"></div>').join('')+'</div>';
}


function campaignCard(c){
  const p     = pct(c.current, c.target);
  const color = CAM_COLORS[c.category] || '#1F4D3F';
  const cls   = p >= 100 ? 'high' : p >= 80 ? 'urgent' : '';
  return `
  <div class="campaign-card">
    <div class="cam-banner" style="background:${color}20${c.imageUrl?';background-image:url(\''+c.imageUrl+'\');background-size:cover;background-position:center':''}">
      ${c.imageUrl?'':'<span>'+(SPECIALTY_ICONS[c.category]||'❤️')+'</span>'}
      ${c.verified?'<span class="cam-verified">'+ICON.check+' Terverifikasi</span>':''}
    </div>
    <div class="cam-body">
      <p class="cam-title">${esc(c.title)}</p>
      <div>
        <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${p}%"></div></div>
        <div class="cam-amounts">
          <span class="cam-raised">${rpFmt(c.current)}</span>
          <span class="cam-pct">${p}%</span>
        </div>
      </div>
      <div class="cam-meta">
        <span>${c.donorCount} donatur</span>
        <span>${daysLeft(c.deadline)}</span>
      </div>
      <div style="font-size:.74rem;color:var(--soft)">oleh ${esc(c.creatorName)}</div>
    </div>
    <div class="cam-actions">
      <a href="#donasi/${c.id}" class="btn btn-outline btn-sm">Detail</a>
      <button class="btn btn-accent btn-sm" onclick="openDonateModal('${c.id}')">Donasi</button>
    </div>
  </div>`;
}



function patientDonationTable(donations, campaignMap){
  if(!donations.length) return emptyState('Belum ada donasi. <a href="#donasi">Donasi sekarang</a>.');
  return '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Campaign</th><th>Donasi</th><th>Tanggal</th></tr></thead><tbody>'+
    donations.map(d=>{
      var cam=campaignMap?.get(d.campaignId);
      return '<tr><td>'+(cam?'<a href="#donasi/'+d.campaignId+'">'+esc(cam.title.slice(0,40))+'…</a>':'Campaign dihapus')+'</td><td><strong>'+rpFmt(d.amount)+'</strong></td><td style="white-space:nowrap">'+esc(d.date)+'</td></tr>';
    }).join('')+
    '</tbody></table></div>';
}

function statusBadge(status){
  var labels={pending:'Menunggu',confirmed:'Dikonfirmasi',completed:'Selesai',cancelled:'Dibatalkan'};
  return '<span class="status-badge s-'+status+'">'+(labels[status]||status)+'</span>';
}

function nurseBookingTable(bookings, viewerRole){
  if(!bookings.length) return emptyState(viewerRole==='patient' ? 'Belum ada janji temu. <a href="#perawat">Cari perawat sekarang</a>.' : 'Belum ada janji temu masuk.');
  return '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Layanan &amp; Tanggal</th><th>Pasien</th><th>Durasi</th><th>Anda Terima</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    bookings.map(b=>'<tr><td><div style="font-size:.84rem;font-weight:600">'+esc(b.service)+'</div><div style="font-size:.74rem;color:var(--soft);margin-top:2px">'+esc(b.date)+' &middot; '+esc(b.time)+'</div></td><td style="font-size:.82rem">'+esc(b.patientProfileName||'—')+'</td><td style="font-size:.82rem">'+b.duration+' jam</td><td style="font-size:.88rem;font-weight:700;color:var(--success);white-space:nowrap">'+rpFmt(b.nursePay||Math.round((b.totalCost||0)*0.8))+'</td><td>'+statusBadge(b.status)+'</td><td style="white-space:nowrap">'+bookingActionsFor(b, viewerRole)+'</td></tr>').join('')+
    '</tbody></table></div>';
}

// viewerRole: 'patient' — pasien lihat booking sendiri, harus bisa langsung bayar
//             'nurse' (default) — perawat lihat booking masuk, aksi terima/tolak/selesai
function bookingActionsFor(b, viewerRole){
  var id = b.id;
  // Chat baru dibuka setelah pembayaran terkonfirmasi — sebelum itu belum
  // ada komitmen nyata, jadi bukan celah buat "nego dulu di chat lalu batal
  // booking resminya" (semua transaksi tetap wajib lewat Akemat).
  var chatLink = b.paymentStatus==='paid' ? ' <a href="#chat/'+id+'" class="btn btn-xs btn-outline">💬 Chat</a>' : '';
  if(viewerRole === 'patient'){
    if(b.paymentStatus !== 'paid') return payBtnHTML(b.status, id);
    if(b.status === 'completed'){
      if(b.reviewed) return '<span style="color:var(--success);font-size:.8rem">✓ Sudah dinilai</span>'+chatLink;
      return '<button class="btn btn-xs btn-accent" onclick="openRateModal(\''+id+'\',\''+esc(b.nurseName||'')+'\')">⭐ Beri Rating</button>'+chatLink;
    }
    return '<span style="color:#9CA3AF">—</span>'+chatLink;
  }
  if(b.paymentStatus !== 'paid'){
    return '<span style="font-size:.72rem;color:var(--soft)">⏳ Menunggu pembayaran pasien</span>';
  }
  if(b.status==='pending'){
    return '<button class="btn btn-xs btn-primary" onclick="updateBooking(\'' + id + '\',\'confirmed\')">Terima</button>' +
           ' <button class="btn btn-xs btn-danger" onclick="updateBooking(\'' + id + '\',\'cancelled\')">Tolak</button>'+chatLink;
  }
  if(b.status==='confirmed'){
    return '<button class="btn btn-xs btn-outline" onclick="updateBooking(\'' + id + '\',\'completed\')">Selesai</button>'+chatLink;
  }
  return '—'+chatLink;
}

function sidebarLinks(role, currentHash){
  var links={patient:[['#dashboard','🏠','Dashboard'],['#perawat','🔍','Cari Perawat'],['#donasi','❤️','Donasi'],['#profil','👤','Profil']],nurse:[['#dashboard','🏠','Dashboard'],['#perawat','🔍','Perawat Lain'],['#profil','👤','Profil & Rekening']],donor:[['#dashboard','🏠','Dashboard'],['#donasi','❤️','Semua Campaign'],['#profil','👤','Profil & Rekening']]};
  return (links[role]||[]).map(function(l){return '<a href="'+l[0]+'" class="'+(currentHash===l[0]?'active':'')+'"><span>'+l[1]+'</span> '+l[2]+'</a>';}).join('');
}

// ── Dashboard table helpers (continued) ──────────────────────
function donorCampaignCards(campaigns, payoutDataMap){
  if(!campaigns.length) return '<p style="color:var(--soft);text-align:center;padding:24px 0">Belum ada campaign. Buat campaign pertama Anda!</p>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">'+
    campaigns.map(function(c){
      var p=pct(c.current,c.target);
      var bk=c.bankInfo;
      var pd = payoutDataMap?.get(c.id) || { available:0, payouts:[] };
      var available = pd.available;
      var payouts   = pd.payouts;
      return '<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:16px">'+
        '<div style="font-weight:700;font-size:.9rem;margin-bottom:6px;color:var(--primary)">'+esc(c.title.slice(0,45))+'…</div>'+
        '<div class="progress-bar" style="margin-bottom:5px"><div class="progress-fill" style="width:'+p+'%"></div></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:8px"><span>'+rpFmt(c.current)+' / '+rpFmt(c.target)+'</span><span>'+p+'%</span></div>'+
        '<div style="font-size:.76rem;color:var(--soft);margin-bottom:10px">🏦 '+(bk&&bk.accountNumber?bk.bankName+' · '+bk.accountNumber:'<span style=\"color:var(--danger)\">Rekening belum diisi</span>')+'</div>'+
        '<div style="font-size:.76rem;color:var(--primary);font-weight:700;margin-bottom:10px">💸 Saldo bisa dicairkan: '+rpFmt(available)+'</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
        '<a href="#donasi/'+c.id+'" class="btn btn-xs btn-outline">Lihat</a> '+
        '<button class="btn btn-xs btn-primary" onclick="openEditCampaignModal(\''+c.id+'\')">Edit Rekening</button> '+
        '<button class="btn btn-xs btn-accent" onclick="requestCampaignPayout(\''+c.id+'\')" '+(available<=0||!(bk&&bk.accountNumber)?'disabled':'')+'>Ajukan Pencairan</button>'+
        '</div>'+
        payoutHistoryTable(payouts)+
        '</div>';
    }).join('')+'</div>';
}

window.requestCampaignPayout = async function(campaignId){
  const cam = await Store.getCampaignById(campaignId);
  if(!cam) return;
  const bank = cam.bankInfo||{};
  if(!bank.accountNumber){ toast('Isi rekening penerima campaign terlebih dahulu.','e'); return; }
  const available = await Store.getCampaignAvailablePayout(campaignId);
  if(available<=0){ toast('Belum ada saldo yang bisa dicairkan.','e'); return; }
  if(!(await customConfirm('Ajukan pencairan '+rpFmt(available)+' ke '+bank.bankName+' '+bank.accountNumber+'?'))) return;
  await Store.addPayoutRequest({
    recipientType:'campaign_owner', campaignId, amount:available,
    bankName:bank.bankName, bankAccountNumber:bank.accountNumber, bankAccountName:bank.accountName,
  });
  toast('Pengajuan pencairan terkirim. Diproses 1-3 hari kerja.','s');
  await renderDonorDash(Store.getCurrentUser());
};

function nurseProfileSection(u){
  var np=u.np||{};
  return '<div class="dash-section"><div class="dash-sh"><h3>Profil Perawat</h3></div>'+
    '<div class="profile-grid">'+
    '<div class="ff"><label>Spesialisasi</label><select id="npSpec">'+SPECIALTIES.map(function(s){return optionHTML(s,SPECIALTY_ICONS[s]+' '+s,np.specialty===s);}).join('')+'</select></div>'+
    '<div class="ff"><label>Pendidikan</label><select id="npEdu">'+EDUCATION_LEVELS.map(function(e){return optionHTML(e,e,np.education===e);}).join('')+'</select></div>'+
    '<div class="ff"><label>Kota</label><input type="text" id="npLoc" value="'+esc(np.loc||'')+'" /></div>'+
    '<div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="npPrice" value="'+(np.price||0)+'" min="'+MIN_NURSE_RATE+'" /><p style="font-size:.72rem;color:var(--soft);margin:4px 0 0">Minimal Rp100.000/jam.</p></div>'+
    '<div class="ff full"><label>Bio</label><textarea id="npBio" rows="3">'+esc(np.bio||'')+'</textarea></div>'+
    '</div>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveNP" style="margin-top:4px">Simpan Profil Perawat</button></div>';
}

function bankStatusSection(u){
  var bank=u.bankInfo||{};
  var verCls=bank.accountNumber?(bank.verified?'verified':'pending'):'empty';
  var verLbl=bank.accountNumber?(bank.verified?'✓ Terverifikasi':'⏳ Menunggu verifikasi'):'❌ Belum diisi';
  var bankDisplay=bank.accountNumber?'<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:18px;margin:14px 0"><div class="bank-display"><span class="bank-display-name">'+esc(bank.bankName)+'</span><span class="bank-display-num">'+esc(bank.accountNumber)+'</span><span class="bank-display-owner">a.n. '+esc(bank.accountName)+'</span></div></div>':'';
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>🏦 Rekening Pencairan Dana</h3><span class="bank-status '+verCls+'">'+verLbl+'</span></div>'+
    '<div class="bank-warning">⚠️ <strong>Wajib diisi:</strong> Data rekening diperlukan untuk pencairan pembayaran janji temu dan donasi.</div>'+
    bankDisplay+
    '<div class="profile-grid" style="margin-top:14px">'+
    '<div class="ff full"><label>Nama Bank</label><select id="bankNameInput">'+optionHTML('','Pilih bank…',!bank.bankName)+BANKS.map(function(b){return optionHTML(b,b,bank.bankName===b);}).join('')+'</select></div>'+
    '<div class="ff"><label>Nomor Rekening</label><input type="text" id="bankAccNum" value="'+esc(bank.accountNumber||'')+'" placeholder="Nomor rekening" /></div>'+
    '<div class="ff"><label>Nama Pemilik</label><input type="text" id="bankAccName" value="'+esc(bank.accountName||'')+'" placeholder="Sesuai buku tabungan" /></div>'+
    '</div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:6px 0 12px">Verifikasi dalam 1×24 jam kerja.</p>'+
    '<label class="consent-row" style="margin-bottom:12px">'+
    '<input type="checkbox" id="bankConsent" />'+
    '<span class="consent-box">'+ICON.check+'</span>'+
    '<span>Saya menyetujui data rekening ini digunakan untuk pencairan dana sesuai <a href="#privasi" target="_blank">Kebijakan Privasi</a>.</span></label>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveBank">Simpan Data Rekening</button></div>';
}

// ── Pencairan Dana (payouts) ──────────────────────────────
function payoutStatusBadge(status){
  var labels={pending:'Menunggu',processing:'Diproses',completed:'Dicairkan',rejected:'Ditolak'};
  var cls={pending:'s-pending',processing:'s-confirmed',completed:'s-completed',rejected:'s-cancelled'}[status]||'s-pending';
  return '<span class="status-badge '+cls+'">'+(labels[status]||status)+'</span>';
}

function payoutHistoryTable(payouts){
  if(!payouts.length) return '<p style="font-size:.8rem;color:var(--soft);margin:8px 0 0">Belum ada riwayat pencairan.</p>';
  return '<div style="overflow-x:auto;margin-top:10px"><table class="tbl"><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Status</th></tr></thead><tbody>'+
    payouts.slice().reverse().map(function(p){
      return '<tr><td style="font-size:.8rem;white-space:nowrap">'+esc(p.requestedAt)+'</td><td style="font-size:.84rem;font-weight:700">'+rpFmt(p.amount)+'</td><td>'+payoutStatusBadge(p.status)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

function nursePayoutSection(u, available, payouts){
  var bankOk    = u.bankInfo?.accountNumber;
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>💸 Pencairan Dana Penghasilan</h3></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'+
    '<div><span style="font-size:.78rem;color:var(--soft);display:block">Saldo tersedia untuk dicairkan</span><strong style="font-family:var(--font-d);font-size:1.2rem;color:var(--primary)">'+rpFmt(available)+'</strong></div>'+
    '<button class="btn btn-accent btn-sm" id="btnAjukanPencairanNurse" '+(available<=0||!bankOk?'disabled':'')+'>Ajukan Pencairan</button>'+
    '</div>'+
    (!bankOk?'<p style="font-size:.76rem;color:var(--danger);margin-top:8px">Isi data rekening di atas terlebih dahulu.</p>':'')+
    payoutHistoryTable(payouts)+
    '</div>';
}

// ── Dashboard ───────────────────────────────────────────────
async function renderDashboard(){
  const u = Store.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  switch(u.role){
    case 'patient': await renderPatientDash(u); break;
    case 'nurse':   await renderNurseDash(u);   break;
    case 'donor':   await renderDonorDash(u);   break;
  }
}

function sidebarHTML(u, activePage){
  const bankOk = u.bankInfo?.accountNumber;
  const links = {
    patient: [
      ['#dashboard',ICON.home,'Dashboard'],['#perawat',ICON.search,'Cari Perawat'],['#donasi',ICON.heart,'Donasi'],['#profil',ICON.user,'Profil & Dokumen'],
    ],
    nurse: [
      ['#dashboard',ICON.home,'Dashboard'],['#perawat',ICON.search,'Perawat Lain'],['#profil',ICON.user,'Profil & Rekening'],
    ],
    donor: [
      ['#dashboard',ICON.home,'Dashboard'],['#donasi',ICON.heart,'Semua Campaign'],['#profil',ICON.user,'Profil & Rekening'],
    ],
  };
  return `
  <div class="sidebar">
    <div class="sb-user">
      <div class="sb-avatar">${initials(u.name)}</div>
      <div class="sb-name">${esc(u.name)}</div>
      <div class="sb-role">${{patient:'Pasien',nurse:'Perawat',donor:'Penggalang Dana'}[u.role]}</div>
      ${u.role!=='patient'?'<div class="sb-bank"><span class="sb-bank-status '+(bankOk?'ok':'warn')+'">'+(bankOk?ICON.check+' Rekening terdaftar':'&#9888; Rekening belum diisi')+'</span></div>':''}
    </div>
    <nav class="sb-nav">
      ${(links[u.role]||[]).map(function([href,icon,label]){return '<a href="'+href+'" class="'+(location.hash===href?'active':'')+'"><span>'+icon+'</span> '+label+'</a>';}).join('')}
    </nav>
    <div class="sb-footer">
      <button class="sb-logout" id="btnLogout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Keluar
      </button>
    </div>
  </div>`;
}

function afterDash(){ document.getElementById('btnLogout')?.addEventListener('click',async ()=>{ await Store.logout(); toast('Berhasil keluar.'); navigate('#'); }); }

async function renderPatientDash(u){
  const [bookings, donations, patientProfiles, reviews] = await Promise.all([Store.getBookingsByPatient(u.id), Store.getDonationsByUser(u.id), Store.getPatientProfiles(u.id), Store.getReviewsByPatient(u.id)]);
  const reviewedBookingIds = new Set(reviews.map(r=>r.bookingId));
  bookings.forEach(b=>{ b.reviewed = reviewedBookingIds.has(b.id); });
  const campaignIds = [...new Set(donations.map(d=>d.campaignId).filter(Boolean))];
  const campaignMap = new Map((await Promise.all(campaignIds.map(cid=>Store.getCampaignById(cid)))).filter(Boolean).map(c=>[c.id,c]));
  const needsPatientProfile = !patientProfiles.some(p=>p.ktpStatus==='uploaded' || p.ktpStatus==='verified');

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Selamat datang, ${esc(u.name.split(' ')[0])}!</h2>
        <p>Kelola janji temu perawat dan riwayat donasi Anda.</p>
        ${needsPatientProfile?'<div class="bank-warning" style="margin-top:10px;max-width:500px;border-color:#FDE68A;background:#FFFBEB">&#128206; Tambahkan profil pasien &amp; unggah KTP di <a href="#profil">Profil</a> sebelum membuat janji temu pertama.</div>':''}
      </div>
      <div class="stat-row" style="grid-template-columns:minmax(0,1fr);max-width:280px">
        <div class="stat-card">
          <div class="stat-icon" style="background:#F0FDF4"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M12 21s-7-4.35-9-9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c-1 4.5-7 9-7 9z"/></svg></div>
          <div><div class="stat-val">${donations.length}</div><div class="stat-lbl">Donasi diberikan</div></div>
        </div>
      </div>

      <!-- Bookings table -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Riwayat Janji Temu Perawat</h3><a href="#perawat" class="btn btn-primary btn-sm">+ Janji Temu Baru</a></div>
        ${nurseBookingTable(bookings, 'patient')}
      </div>

      <!-- Donations table -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Riwayat Donasi</h3><a href="#donasi" class="btn btn-outline btn-sm">Lihat Campaign</a></div>
        ${patientDonationTable(donations, campaignMap)}
      </div>
    </div>
  </div>`;
  afterDash();
}

async function renderNurseDash(u){
  const bookings = await Store.getBookingsByNurse(u.id);
  const earned   = bookings.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.nursePay||0),0);
  const p        = u.np || {};

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Dashboard Perawat</h2>
        <p>Kelola profil, jadwal, dan penghasilan Anda.</p>
        ${!u.bankInfo?.accountNumber?'<div class="bank-warning" style="margin-top:10px;max-width:500px">&#9888;&#65039; <strong>Penting!</strong> Isi data rekening di <a href="#profil">Profil</a> agar penghasilan bisa dicairkan.</div>':''}
      </div>
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:#F0FDF4"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></div>
          <div><div class="stat-val">${rpFmt(earned)}</div><div class="stat-lbl">Total penghasilan (80%)</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#EEF2FF"><svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <div><div class="stat-val">${bookings.length}</div><div class="stat-lbl">Total janji temu masuk</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FFF7ED"><svg viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div><div class="stat-val">${bookings.filter(b=>b.status==='pending').length}</div><div class="stat-lbl">Menunggu konfirmasi</div></div>
        </div>
      </div>

      <!-- Status toggle -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Status Ketersediaan</h3></div>
        <div class="toggle-wrap">
          <label class="toggle">
            <input type="checkbox" id="availToggle" ${p.avail?'checked':''}>
            <span class="toggle-track"></span>
          </label>
          <span class="toggle-label" id="availLabel">${p.avail?'✅ Saya tersedia untuk janji temu':'⏸ Saya tidak tersedia'}</span>
        </div>
        <p style="font-size:.82rem;color:var(--soft);margin-top:8px">Nonaktifkan jika sedang cuti atau penuh jadwal.</p>
      </div>

      <!-- Bookings -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Permintaan & Riwayat Janji Temu</h3></div>
        ${nurseBookingTable(bookings, 'nurse')}
      </div>
    </div>
  </div>`;

  afterDash();
  document.getElementById('availToggle')?.addEventListener('change', async function(){
    const np = {...(u.np||{}), avail: this.checked};
    await Store.updateUser(u.id, {np});
    document.getElementById('availLabel').textContent = this.checked?'✅ Saya tersedia untuk janji temu':'⏸ Saya tidak tersedia';
    toast(this.checked?'Status tersedia diaktifkan.':'Status dinonaktifkan.','s');
  });
}

async function renderDonorDash(u){
  const [campaigns, donations] = await Promise.all([Store.getCampaignsByUser(u.id), Store.getDonationsByUser(u.id)]);
  const totalDon  = donations.reduce((s,d)=>s+d.amount,0);
  const payoutDataMap = new Map(await Promise.all(campaigns.map(async c => [c.id, {
    available: await Store.getCampaignAvailablePayout(c.id),
    payouts:   await Store.getPayoutsByCampaign(c.id),
  }])));

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Dashboard Penggalang Dana</h2>
        <p>Kelola campaign donasi dan riwayat kontribusi Anda.</p>
      </div>
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:#FDF4FF"><svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2"><path d="M12 21s-7-4.35-9-9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c-1 4.5-7 9-7 9z"/></svg></div>
          <div><div class="stat-val">${campaigns.length}</div><div class="stat-lbl">Campaign dibuat</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#F0FDF4"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></div>
          <div><div class="stat-val">${rpFmt(totalDon)}</div><div class="stat-lbl">Total donasi diberikan</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#EEF2FF"><svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
          <div><div class="stat-val">${campaigns.reduce((s,c)=>s+c.current,0).toLocaleString('id-ID')}</div><div class="stat-lbl">Total terkumpul campaign</div></div>
        </div>
      </div>

      <div class="dash-section">
        <div class="dash-sh"><h3>Campaign Saya</h3><button class="btn btn-accent btn-sm" onclick="openCreateCampaignModal()">+ Buat Campaign</button></div>
        ${donorCampaignCards(campaigns, payoutDataMap)}
      </div>
    </div>
  </div>`;
  afterDash();
}

// ── Modals ──────────────────────────────────────────────────
function openModal(id)  { haptic(8); document.getElementById(id)?.classList.add('open'); document.body.style.overflow='hidden'; document.body.classList.add('modal-open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; document.body.classList.remove('modal-open'); }

// Ganti window.confirm() bawaan browser (kotak abu-abu "situs ini
// mengatakan…" yang sama sekali tidak bisa didandani) dengan dialog senada
// tema app. Dipakai lewat `if(await customConfirm('...')) { ... }` — API-nya
// sengaja mirip confirm() (balikin true/false) supaya gampang ditukar di
// tempat yang sudah ada, tapi async karena dibangun dari DOM+event biasa.
// opts.requireText: buat aksi yang PERMANEN/sangat berisiko (mis. hapus
// akun) — pengguna wajib ketik ulang teks itu persis sebelum tombol OK
// aktif, ganti window.prompt() bawaan yang sama-sama tidak bisa didandani.
function customConfirm(message, opts){
  opts = opts || {};
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML =
      '<div class="modal confirm-modal" role="alertdialog" aria-modal="true">'+
        '<div class="confirm-icon'+(opts.danger?' danger':'')+'">'+(opts.danger?'⚠️':'❓')+'</div>'+
        '<p class="confirm-msg">'+esc(message)+'</p>'+
        (opts.requireText?'<input type="text" id="ccInput" class="confirm-input" placeholder="'+esc(opts.requireText)+'" autocomplete="off" autocapitalize="off" />':'')+
        '<div class="confirm-acts">'+
          '<button type="button" class="btn btn-outline" id="ccCancel">'+esc(opts.cancelLabel||'Batal')+'</button>'+
          '<button type="button" class="btn '+(opts.danger?'btn-danger':'btn-primary')+'" id="ccOk"'+(opts.requireText?' disabled':'')+'>'+esc(opts.okLabel||'Ya, Lanjutkan')+'</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    function finish(result){
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      document.body.classList.remove('modal-open');
      resolve(result);
    }
    function onKey(e){ if(e.key === 'Escape') finish(false); }
    const okBtn = overlay.querySelector('#ccOk');
    if(opts.requireText){
      const input = overlay.querySelector('#ccInput');
      input.addEventListener('input', ()=>{ okBtn.disabled = input.value !== opts.requireText; });
      input.focus();
    } else {
      okBtn.focus();
    }
    overlay.querySelector('#ccCancel').addEventListener('click', ()=>finish(false));
    okBtn.addEventListener('click', ()=>{ if(!okBtn.disabled) finish(true); });
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) finish(false); });
    document.addEventListener('keydown', onKey);
  });
}

// ── Custom select (bottom-sheet di HP, dropdown ala app) ────────
// Native <select> dibutuhkan browser jelek/tidak konsisten pas dibuka di
// Android (jadi picker gelap bawaan OS, tidak mengikuti tema app sama
// sekali). Elemen <select> ASLI tetap ada di DOM (disembunyikan visual)
// supaya semua logika filter yang sudah baca .value / dengar event
// 'change' tetap jalan tanpa perlu diubah — cuma cara BUKANYA yang diganti
// jadi bottom-sheet custom yang gayanya sama seperti modal lain di app ini.
let _cselOverlay = null;
// Fokus dikembalikan ke tombol trigger yang membuka sheet begitu sheet
// ditutup (klik opsi, backdrop, atau Esc) — supaya pengguna keyboard/screen
// reader tidak "kehilangan tempat" setelah sheet hilang dari DOM visual.
let _sheetLastTrigger = null;
document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Escape') return;
  if(_cselOverlay?.classList.contains('open')) closeCselSheet();
  else if(_cdateOverlay?.classList.contains('open')) closeCdateSheet();
});
function ensureCselOverlay(){
  if(_cselOverlay) return _cselOverlay;
  const el = document.createElement('div');
  el.className = 'csel-overlay';
  el.innerHTML = '<div class="csel-sheet" role="dialog" aria-modal="true" aria-labelledby="cselTitle"><div class="csel-handle"></div><div class="csel-title" id="cselTitle"></div><div class="csel-options" id="cselOptions" role="listbox"></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click', (e)=>{ if(e.target === el) closeCselSheet(); });
  _cselOverlay = el;
  return el;
}
function closeCselSheet(){
  if(!_cselOverlay) return;
  _cselOverlay.classList.remove('open');
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  _sheetLastTrigger?.setAttribute('aria-expanded', 'false');
  _sheetLastTrigger?.focus();
  _sheetLastTrigger = null;
}
function openCselSheet(selectEl, title, onPick){
  haptic(8);
  const overlay = ensureCselOverlay();
  document.getElementById('cselTitle').textContent = title;
  const optsWrap = document.getElementById('cselOptions');
  optsWrap.innerHTML = [...selectEl.options].map(o=>
    '<button type="button" class="csel-opt'+(o.value===selectEl.value?' active':'')+'" role="option" aria-selected="'+(o.value===selectEl.value)+'" data-value="'+esc(o.value)+'">'+
    '<span>'+esc(o.textContent)+'</span>'+(o.value===selectEl.value?'<span class="csel-check">'+ICON.check+'</span>':'')+
    '</button>'
  ).join('');
  optsWrap.querySelectorAll('.csel-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectEl.value = btn.dataset.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      onPick();
      closeCselSheet();
    });
  });
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  optsWrap.querySelector('.csel-opt.active, .csel-opt')?.focus();
}
function enhanceSelect(selectEl, title){
  if(!selectEl || selectEl.dataset.cselEnhanced) return;
  selectEl.dataset.cselEnhanced = '1';
  selectEl.classList.add('csel-native-hidden');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csel-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  selectEl.insertAdjacentElement('afterend', trigger);
  function render(){
    const label = selectEl.options[selectEl.selectedIndex]?.textContent || '';
    trigger.innerHTML = '<span>'+esc(label)+'</span><span class="csel-chevron">'+ICON.chevronDown+'</span>';
  }
  render();
  trigger.addEventListener('click', ()=>{
    _sheetLastTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    openCselSheet(selectEl, title, render);
  });
  selectEl.addEventListener('change', render); // jaga-jaga ada kode lain yang set .value lalu dispatch 'change' manual
}

// ── Custom date picker (ganti native <input type="date">, biar tidak jadi
// kalender gelap OS Android yang tidak nyambung dengan tema app) ──────────
const ID_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const ID_DAYS_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
function fmtIdDate(isoStr){
  if(!isoStr) return '';
  const d = new Date(isoStr+'T00:00:00');
  if(isNaN(d.getTime())) return isoStr;
  return d.getDate()+' '+ID_MONTHS[d.getMonth()]+' '+d.getFullYear();
}
let _cdateOverlay = null;
function ensureCdateOverlay(){
  if(_cdateOverlay) return _cdateOverlay;
  const el = document.createElement('div');
  el.className = 'csel-overlay cdate-overlay';
  el.innerHTML = '<div class="csel-sheet cdate-sheet" role="dialog" aria-modal="true" aria-labelledby="cdateTitle"><div class="csel-handle"></div>'+
    '<div class="csel-title" id="cdateTitle"></div>'+
    '<div class="cdate-nav">'+
      '<button type="button" class="cdate-navbtn" id="cdatePrev" aria-label="Sebelumnya">'+ICON.chevronLeft+'</button>'+
      '<button type="button" class="cdate-navlabel" id="cdateLabel"></button>'+
      '<button type="button" class="cdate-navbtn" id="cdateNext" aria-label="Berikutnya">'+ICON.chevronRight+'</button>'+
    '</div>'+
    '<div class="cdate-body" id="cdateBody"></div>'+
  '</div>';
  document.body.appendChild(el);
  el.addEventListener('click', (e)=>{ if(e.target === el) closeCdateSheet(); });
  _cdateOverlay = el;
  return el;
}
function closeCdateSheet(){
  if(!_cdateOverlay) return;
  _cdateOverlay.classList.remove('open');
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  _sheetLastTrigger?.setAttribute('aria-expanded', 'false');
  _sheetLastTrigger?.focus();
  _sheetLastTrigger = null;
}
function openCdateSheet(inputEl, title, onPick){
  haptic(8);
  const overlay = ensureCdateOverlay();
  document.getElementById('cdateTitle').textContent = title;
  const today = new Date();
  const sel = inputEl.value ? new Date(inputEl.value+'T00:00:00') : null;
  let view = 'days';
  let y = sel && !isNaN(sel.getTime()) ? sel.getFullYear() : today.getFullYear();
  let m = sel && !isNaN(sel.getTime()) ? sel.getMonth() : today.getMonth();
  const label   = document.getElementById('cdateLabel');
  const prevBtn = document.getElementById('cdatePrev');
  const nextBtn = document.getElementById('cdateNext');
  const body    = document.getElementById('cdateBody');

  function pad(n){ return String(n).padStart(2,'0'); }
  function pick(yy,mm,dd){
    inputEl.value = yy+'-'+pad(mm+1)+'-'+pad(dd);
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    onPick();
    closeCdateSheet();
  }
  function renderView(){
    if(view === 'days'){
      prevBtn.style.visibility = 'visible'; nextBtn.style.visibility = 'visible';
      label.textContent = ID_MONTHS[m]+' '+y;
      const firstDow = new Date(y,m,1).getDay();
      const daysInMonth = new Date(y,m+1,0).getDate();
      let html = '<div class="cdate-weekdays">'+ID_DAYS_SHORT.map(d=>'<span>'+d+'</span>').join('')+'</div><div class="cdate-days">';
      for(let i=0;i<firstDow;i++) html += '<span class="cdate-day empty"></span>';
      for(let d=1; d<=daysInMonth; d++){
        const isSel   = sel && !isNaN(sel.getTime()) && sel.getFullYear()===y && sel.getMonth()===m && sel.getDate()===d;
        const isToday = today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;
        html += '<button type="button" class="cdate-day'+(isSel?' selected':(isToday?' today':''))+'" data-d="'+d+'">'+d+'</button>';
      }
      html += '</div>';
      body.innerHTML = html;
      body.querySelectorAll('.cdate-day:not(.empty)').forEach(btn=>{
        btn.addEventListener('click', ()=>pick(y, m, parseInt(btn.dataset.d)));
      });
    } else if(view === 'months'){
      prevBtn.style.visibility = 'hidden'; nextBtn.style.visibility = 'hidden';
      label.textContent = String(y);
      body.innerHTML = '<div class="cdate-months">'+ID_MONTHS.map((mn,i)=>
        '<button type="button" class="cdate-month'+(i===m?' selected':'')+'" data-m="'+i+'">'+mn.slice(0,3)+'</button>'
      ).join('')+'</div>';
      body.querySelectorAll('.cdate-month').forEach(btn=>{
        btn.addEventListener('click', ()=>{ m = parseInt(btn.dataset.m); view = 'days'; renderView(); });
      });
    } else { // years
      prevBtn.style.visibility = 'hidden'; nextBtn.style.visibility = 'hidden';
      label.textContent = 'Pilih Tahun';
      const endY = today.getFullYear(), startY = endY - 100;
      let html = '<div class="cdate-years">';
      for(let yy=endY; yy>=startY; yy--) html += '<button type="button" class="cdate-year'+(yy===y?' selected':'')+'" data-y="'+yy+'">'+yy+'</button>';
      html += '</div>';
      body.innerHTML = html;
      body.querySelectorAll('.cdate-year').forEach(btn=>{
        btn.addEventListener('click', ()=>{ y = parseInt(btn.dataset.y); view = 'months'; renderView(); });
      });
      body.querySelector('.cdate-year.selected')?.scrollIntoView({ block:'center' });
    }
  }
  prevBtn.onclick  = ()=>{ if(view!=='days') return; m--; if(m<0){ m=11; y--; } renderView(); };
  nextBtn.onclick  = ()=>{ if(view!=='days') return; m++; if(m>11){ m=0; y++; } renderView(); };
  label.onclick    = ()=>{ view = view==='days' ? 'years' : (view==='years' ? 'days' : 'years'); renderView(); };
  view = 'days';
  renderView();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
}
function enhanceDateInput(inputEl, title){
  if(!inputEl || inputEl.dataset.cdateEnhanced) return;
  inputEl.dataset.cdateEnhanced = '1';
  inputEl.classList.add('csel-native-hidden');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csel-trigger cdate-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  inputEl.insertAdjacentElement('afterend', trigger);
  function render(){
    const has = !!inputEl.value;
    trigger.innerHTML = '<span'+(has?'':' style="color:var(--soft)"')+'>'+esc(has?fmtIdDate(inputEl.value):'Pilih tanggal')+'</span><span class="csel-chevron">'+ICON.chevronDown+'</span>';
  }
  render();
  trigger.addEventListener('click', ()=>{
    _sheetLastTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    openCdateSheet(inputEl, title, render);
  });
  inputEl.addEventListener('change', render);
}

async function openDonateModal(campaignId){
  const u   = Store.getCurrentUser();
  const cam = await Store.getCampaignById(campaignId);
  if(!cam) return;
  let selAmt = 0;

  document.getElementById('donModalCamTitle').textContent = cam.title.slice(0,55)+'…';
  document.getElementById('donModalCamPct').style.width   = pct(cam.current,cam.target)+'%';
  document.getElementById('donModalCamRaised').textContent= rpFmt(cam.current)+' / '+rpFmt(cam.target);
  document.getElementById('donCamId').value = campaignId;
  if(u){ document.getElementById('donBuyerName').value=u.name; document.getElementById('donBuyerEmail').value=u.email; document.getElementById('donBuyerPhone').value=u.phone||''; }
  updateDonTotal();
  openModal('modalDonate');

  document.querySelectorAll('.d-amt-btn').forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll('.d-amt-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selAmt = parseInt(btn.dataset.amt);
      document.getElementById('donCustomAmt').value='';
      updateDonTotal();
    };
  });
  document.getElementById('donCustomAmt')?.addEventListener('input',()=>{
    document.querySelectorAll('.d-amt-btn').forEach(b=>b.classList.remove('active'));
    selAmt = parseInt(document.getElementById('donCustomAmt')?.value)||0;
    updateDonTotal();
  });

  function updateDonTotal(){
    const amt = selAmt || parseInt(document.getElementById('donCustomAmt')?.value)||0;
    document.getElementById('donTotalDisp').textContent = rpFmt(amt);
  }

  document.getElementById('btnSubmitDonation').onclick=async()=>{
    const amt   = selAmt||parseInt(document.getElementById('donCustomAmt')?.value)||0;
    const name  = document.getElementById('donBuyerName')?.value.trim();
    const email = document.getElementById('donBuyerEmail')?.value.trim();
    const phone = document.getElementById('donBuyerPhone')?.value.trim();
    const anon  = document.getElementById('donAnon')?.checked;
    const cid   = document.getElementById('donCamId')?.value;
    if(amt<15000){ toast('Minimal donasi Rp 15.000.','e'); return; }
    if(!name||!email||!phone){ toast('Nama, email, dan no HP wajib diisi.','e'); return; }
    const btn = document.getElementById('btnSubmitDonation');
    const orig = btn.textContent;
    btn.disabled=true; btn.textContent='Memproses…';
    try {
      // Simpan metadata donasi (belum lunas) — baru dikreditkan ke campaign
      // setelah DOKU mengonfirmasi pembayaran di payment-return.html
      await Payment.payDonation({
        amount: amt, campaignId: cid,
        campaignTitle: cam.title, buyerName: name,
        buyerEmail: email, buyerPhone: phone,
        anonymous: anon, donorId: u?.id||'guest',
      });
      // Jika berhasil, browser sudah diarahkan ke halaman pembayaran DOKU.
    } catch(err) {
      // Pembayaran WAJIB lewat DOKU — jangan catat donasi tanpa pembayaran nyata.
      toast('Gagal membuat transaksi pembayaran: '+(err.message||'coba lagi.'), 'e');
      console.error('[Payment] DOKU error:', err.message);
    }
    btn.disabled=false; btn.textContent=orig;
  };
}

function openBookingModal(nurseId){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
  if(u.role!=='patient'){ toast('Hanya pasien yang bisa membuat janji temu dengan perawat.','e'); return; }
  navigate('#perawat/'+nurseId);
}

function openCreateCampaignModal(){
  const u = Store.getCurrentUser();
  if(!u||u.role!=='donor'){ toast('Hanya Penggalang Dana yang bisa membuat campaign.','e'); return; }
  openModal('modalCreateCampaign');

  let imageDataUrl = '';
  const imgInput = document.getElementById('ccImage');
  const imgPreview = document.getElementById('ccImagePreview');
  const imgPlaceholder = document.getElementById('ccImagePlaceholder');
  if(imgInput) imgInput.value = '';
  if(imgPreview){ imgPreview.style.display='none'; imgPreview.src=''; }
  if(imgPlaceholder) imgPlaceholder.style.display='';

  if(imgInput) imgInput.onchange = async ()=>{
    const file = imgInput.files?.[0];
    if(!file) return;
    imgPlaceholder.textContent = 'Memproses foto…';
    try {
      imageDataUrl = await fileToResizedDataUrl(file);
      imgPreview.src = imageDataUrl;
      imgPreview.style.display = 'block';
      imgPlaceholder.style.display = 'none';
    } catch(e){
      toast(e.message||'Gagal memproses foto.','e');
      imgPlaceholder.textContent = '📷 Pilih foto (opsional, tapi lebih dipercaya donatur)';
    }
  };

  document.getElementById('btnCreateCampaign').onclick=async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return; // cegah double-tap bikin campaign dua kali
    const title    = document.getElementById('ccTitle')?.value.trim();
    const story    = document.getElementById('ccStory')?.value.trim();
    const target   = parseInt(document.getElementById('ccTarget')?.value)||0;
    const deadline = document.getElementById('ccDeadline')?.value;
    const category = document.getElementById('ccCategory')?.value;
    const bankName = document.getElementById('ccBankName')?.value;
    const accNum   = document.getElementById('ccAccNum')?.value.trim();
    const accOwner = document.getElementById('ccAccOwner')?.value.trim();
    if(!title||!story||!target||!deadline){ toast('Lengkapi semua field wajib.','e'); return; }
    if(!bankName||!accNum||!accOwner){ toast('Data rekening wajib diisi agar donasi bisa dicairkan.','e'); return; }
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      await Store.addCampaign({
        title, story, target, deadline, category,
        createdBy: u.id, creatorName: u.name,
        verified: false, imageUrl: imageDataUrl,
        bankInfo: { bankName, accountNumber:accNum, accountName:accOwner, verified:false },
      });
    } catch(e) {
      toast('Gagal membuat campaign: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = orig;
      return;
    }
    closeModal('modalCreateCampaign');
    toast('Campaign berhasil dibuat!','s');
    renderDonorDash(Store.getCurrentUser());
  };
}

async function openEditCampaignModal(campaignId){
  const cam = await Store.getCampaignById(campaignId);
  if(!cam) return;
  const bank = cam.bankInfo||{};
  document.getElementById('ecCamId').value    = campaignId;
  document.getElementById('ecBankName').value = bank.bankName||'';
  document.getElementById('ecAccNum').value   = bank.accountNumber||'';
  document.getElementById('ecAccOwner').value = bank.accountName||'';
  openModal('modalEditCampaign');
  document.getElementById('btnSaveEditCampaign').onclick=async ()=>{
    const cid     = document.getElementById('ecCamId')?.value;
    const bankName= document.getElementById('ecBankName')?.value;
    const accNum  = document.getElementById('ecAccNum')?.value.trim();
    const accOwner= document.getElementById('ecAccOwner')?.value.trim();
    if(!bankName||!accNum||!accOwner){ toast('Lengkapi semua data rekening.','e'); return; }
    await Store.updateCampaign(cid, { bankInfo:{ bankName, accountNumber:accNum, accountName:accOwner, verified:false }});
    closeModal('modalEditCampaign');
    toast('Data rekening campaign disimpan.','s');
    renderDonorDash(Store.getCurrentUser());
  };
}

function openRateModal(bookingId, nurseName){
  let selRating = 0;
  document.getElementById('rnNurseLabel').textContent = nurseName ? 'Bagaimana pengalaman Anda dengan '+nurseName+'?' : 'Bagaimana pengalaman Anda dengan perawat ini?';
  document.getElementById('rnBookingId').value = bookingId;
  document.getElementById('rnComment').value = '';
  const stars = [...document.querySelectorAll('#rnStars .star-btn')];
  function paintStars(n){ stars.forEach(s=>s.classList.toggle('on', +s.dataset.star <= n)); }
  paintStars(0);
  stars.forEach(s=>{
    s.onclick = ()=>{ selRating = +s.dataset.star; paintStars(selRating); };
  });
  openModal('modalRateNurse');
  document.getElementById('btnSubmitReview').onclick = async ()=>{
    if(!selRating){ toast('Pilih rating bintang terlebih dahulu.','e'); return; }
    const btn = document.getElementById('btnSubmitReview');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      await Store.addReview({ bookingId, rating: selRating, comment: document.getElementById('rnComment')?.value.trim() });
      closeModal('modalRateNurse');
      toast('Terima kasih atas rating Anda!','s');
      renderDashboard();
    } catch(e) {
      toast('Gagal mengirim rating: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = orig;
    }
  };
}

// Global helpers
window.openDonateModal        = openDonateModal;
window.openBookingModal       = openBookingModal;
window.openCreateCampaignModal= openCreateCampaignModal;
window.openEditCampaignModal  = openEditCampaignModal;
window.openRateModal          = openRateModal;
window.updateBooking = async (id, status)=>{
  if(status==='confirmed'||status==='completed'){
    const bookings = await Store.getBookings();
    const bk = bookings.find(b=>b.id===id);
    if(!bk || bk.paymentStatus!=='paid'){ toast('Janji temu belum dibayar oleh pasien.','e'); return; }
  }
  await Store.updateBooking(id, {status});
  toast({confirmed:'Janji temu dikonfirmasi!',cancelled:'Janji temu ditolak.',completed:'Janji temu selesai!'}[status]||'Updated','s');
  renderDashboard();
};

// ── TNC ────────────────────────────────────────────────────


function renderFooterSection(){
  var html = '<footer class="site-footer">';
  html += '<div class="container footer-inner">';
  html += '<div class="footer-brand">';
  html += '<a href="#" class="logo" aria-label="Akemat Foundation, kembali ke beranda"><svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="10" fill="#F2A541"/><path d="M24 36c-7-5.5-13-10.8-13-17A8 8 0 0 1 24 13a8 8 0 0 1 13 6c0 6.2-6 11.5-13 17z" fill="#FBF7F1"/></svg><span>Akemat <strong>Foundation</strong></span></a>';
  html += '<p>Menghadirkan perawat tepercaya bagi keluarga yang membutuhkan, didukung oleh donasi masyarakat.</p>';
  html += '<div class="social-links">';
  html += '<a href="https://wa.me/6285196407117?text=Halo%20Akemat%20Foundation%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20Anda." target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="wa-social-icon">'+ICON.whatsapp+'</a>';
  html += '<a href="https://www.instagram.com/akemat.foundation?igsh=dW53N21kcjM3dm1o" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>';
  html += '<a href="https://www.linkedin.com/company/akemat-foundation/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>';
  html += '</div></div>';
  html += '<nav class="f-nav"><h4>Platform</h4><ul>';
  html += '<li><a href="#perawat">Cari Perawat</a></li>';
  html += '<li><a href="#donasi">Kampanye Donasi</a></li>';
  html += '<li><a href="#register">Daftar Perawat</a></li>';
  html += '<li><a href="#dashboard">Dashboard</a></li>';
  html += '</ul></nav>';
  html += '<div class="f-cta"><h4>Informasi</h4><ul class="f-nav" style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px">';
  html += '<li><a href="#faq" style="color:#C5D8CD;font-size:.84rem">FAQ</a></li>';
  html += '<li><a href="#tnc" style="color:#C5D8CD;font-size:.84rem">Syarat &amp; Ketentuan</a></li>';
  html += '<li><a href="#privasi" style="color:#C5D8CD;font-size:.84rem">Kebijakan Privasi</a></li>';
  html += '<li><a href="mailto:customercare@akematfoundation.org" style="color:#C5D8CD;font-size:.84rem">customercare@akematfoundation.org</a></li>';
  html += '<li><a href="https://wa.me/6285196407117" style="color:#C5D8CD;font-size:.84rem">WhatsApp 0851 9640 7117</a></li>';
  html += '</ul></div>';
  html += '</div>';
  html += '<div class="container footer-bottom">';
  html += '<p>&copy; '+new Date().getFullYear()+' Akemat Foundation. Semua hak cipta dilindungi.</p>';
  html += '<p><a href="#tnc" style="color:#A9BEB6">Syarat &amp; Ketentuan</a> &middot; <a href="#privasi" style="color:#A9BEB6">Kebijakan Privasi</a> &middot; <a href="#faq" style="color:#A9BEB6">FAQ</a></p>';
  html += '</div></footer>';
  return html;
}

function emptyState(msg){
  return '<div class="empty-state"><div class="empty-icon">📭</div><p>' + msg + '</p></div>';
}

// ── openPayBook: trigger DOKU payment for booking ──────────
async function openPayBook(bookingId){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); return; }
  const bookings = await Store.getBookingsByPatient(u.id);
  const bk = bookings.find(b=>b.id===bookingId);
  if(!bk){ toast('Janji temu tidak ditemukan.','e'); return; }
  try {
    await Payment.payBooking({
      bookingId:   bk.id,
      totalCost:   bk.totalCost,
      nurseName:   bk.nurseName,
      service:     bk.service,
      buyerName:   u.name,
      buyerEmail:  u.email,
      buyerPhone:  u.phone||'08000000000',
    });
  } catch(err) {
    toast('Gagal membuka pembayaran: '+(err.message||'coba lagi.')+' — mengarahkan ke WhatsApp.', 'e');
    window.open('https://wa.me/6285196407117?text='+encodeURIComponent('Halo Akemat, saya ingin bayar janji temu '+bk.service+' ('+bk.date+'). Nama: '+u.name),'_blank');
    console.error('[Payment] DOKU redirect failed:', err.message);
  }
}
window.openPayBook = openPayBook;

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',async ()=>{
  await Store.init();
  route();

  // Mobile nav toggle
  document.getElementById('navToggle')?.addEventListener('click',()=>{
    const nav = document.getElementById('mainNav');
    const open= nav?.getAttribute('data-open')==='true';
    nav?.setAttribute('data-open', open?'false':'true');
  });

  // Close nav on link click (mobile)
  document.getElementById('mainNav')?.addEventListener('click',e=>{
    if(e.target.tagName==='A') document.getElementById('mainNav')?.setAttribute('data-open','false');
  });

  // Getar halus tiap tap tab bawah — tabbar di-render ulang tiap route()
  // (innerHTML diganti total), jadi listener-nya di-delegasikan ke induk
  // yang tidak ikut diganti, bukan dipasang ulang tiap render.
  document.getElementById('mobileTabbar')?.addEventListener('click', (e)=>{
    if(e.target.closest('a')) haptic(8);
  });

  // Payment buttons (data-pay) — event delegation
  document.addEventListener('click',e=>{
    const payBtn = e.target.closest('[data-pay]');
    if(payBtn){ openPayBook(payBtn.dataset.pay); return; }
  });

  // Tombol lihat/sembunyikan password — event delegation (aman lintas re-render)
  document.addEventListener('click',e=>{
    const pwBtn = e.target.closest('[data-pw-toggle]');
    if(pwBtn){ togglePwField(pwBtn); return; }
  });

  // Modal close buttons & overlay click
  document.addEventListener('click',e=>{
    if(e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
    if(e.target.classList.contains('modal-x')) closeModal(e.target.closest('.modal-overlay')?.id);
  });

  // Header menyembunyikan diri pas scroll ke bawah, muncul lagi pas scroll
  // ke atas (selalu terlihat dekat puncak halaman) — pola umum app native
  // biar layar lebih lega buat konten pas scroll baca-baca.
  (function(){
    const header = document.querySelector('.site-header');
    if(!header) return;
    let lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', ()=>{
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(()=>{
        const y = window.scrollY;
        if(y > lastY + 4 && y > 80) header.classList.add('header-hidden');
        else if(y < lastY - 4 || y <= 80) header.classList.remove('header-hidden');
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  })();

  // Pull-to-refresh custom (bounce browser native sudah dimatikan lewat
  // overscroll-behavior-y:contain di body — ini penggantinya, cuma aktif
  // dari touch di puncak halaman & bukan pas modal terbuka).
  (function(){
    const indicator = document.getElementById('ptr-indicator');
    if(!indicator) return;
    const THRESHOLD = 64, MAX_PULL = 90;
    let startY = null, pulling = false, refreshing = false;

    document.addEventListener('touchstart', (e)=>{
      if(refreshing || window.scrollY > 0 || document.body.classList.contains('modal-open')) { startY = null; return; }
      startY = e.touches[0].clientY;
      pulling = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e)=>{
      if(startY == null || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if(dy <= 0) { pulling = false; indicator.classList.remove('visible'); return; }
      if(window.scrollY > 0) return; // sempat scroll duluan, batalkan
      pulling = true;
      e.preventDefault();
      const pull = Math.min(MAX_PULL, dy * 0.5);
      indicator.style.transform = 'translate(-50%,'+pull+'px) scale('+(0.5+pull/MAX_PULL*0.5)+')';
      indicator.classList.add('visible');
    }, { passive: false });

    document.addEventListener('touchend', async ()=>{
      if(!pulling){ startY = null; return; }
      pulling = false;
      const dy = indicator.style.transform.match(/,([\d.]+)px/);
      const pull = dy ? parseFloat(dy[1]) : 0;
      startY = null;
      if(pull >= THRESHOLD){
        haptic(12);
        refreshing = true;
        indicator.classList.add('refreshing');
        indicator.style.transform = 'translate(-50%,'+THRESHOLD+'px) scale(1)';
        cacheInvalidate('nurses:');
        cacheInvalidate('campaigns:');
        const started = Date.now();
        await route();
        const elapsed = Date.now() - started;
        if(elapsed < 500) await new Promise(r=>setTimeout(r, 500 - elapsed));
        indicator.classList.remove('refreshing','visible');
        indicator.style.transform = '';
        refreshing = false;
      } else {
        indicator.classList.remove('visible');
        indicator.style.transform = '';
      }
    }, { passive: true });
  })();

  // Banner "Tidak ada koneksi" — native app selalu kasih tahu jelas kalau
  // offline, bukan diam-diam gagal fetch dengan pesan error teknis.
  (function(){
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    let hideTimer = null;
    function setOffline(){
      clearTimeout(hideTimer);
      banner.textContent = 'Anda sedang offline';
      banner.className = 'show offline';
    }
    function setOnline(){
      if(!banner.classList.contains('offline')) return; // skip di load pertama
      banner.textContent = 'Kembali online';
      banner.className = 'show online';
      hideTimer = setTimeout(()=>banner.classList.remove('show'), 2000);
    }
    window.addEventListener('offline', setOffline);
    window.addEventListener('online', setOnline);
    if(!navigator.onLine) setOffline();
  })();

  // ── Prompt instal ke Home Screen — banner custom senada desain app,
  // bukan mini-infobar generic bawaan Chrome. Android/Chrome/Edge pakai
  // event beforeinstallprompt asli (ditahan lalu ditampilkan lewat UI
  // sendiri); iOS Safari tidak punya event ini sama sekali, jadi dikasih
  // instruksi manual (Share → Tambah ke Layar Utama) sebagai gantinya,
  // baru muncul setelah pengunjung sempat menjelajah (bukan langsung di
  // detik pertama buka situs). Ditutup = tidak muncul lagi 14 hari.
  (function(){
    const DISMISS_KEY = 'akemat_install_dismissed_until';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if(isStandalone) return; // sudah terinstal
    if(Date.now() < Number(localStorage.getItem(DISMISS_KEY) || 0)) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let banner = null;

    function dismiss(days){
      haptic(10);
      localStorage.setItem(DISMISS_KEY, String(Date.now() + days*86400000));
      banner?.classList.remove('show');
      setTimeout(()=>banner?.remove(), 300);
    }

    function buildBanner(mode){
      const el = document.createElement('div');
      el.id = 'install-banner';
      el.setAttribute('data-mode', mode);
      el.setAttribute('role','dialog');
      el.setAttribute('aria-label','Instal aplikasi Akemat Foundation');
      el.innerHTML = mode==='ios'
        ? '<div class="install-banner-icon">📲</div>'+
          '<div class="install-banner-body"><strong>Instal Akemat di HP Anda</strong>'+
          '<p>Tap tombol Bagikan '+ICON.share+' di browser, lalu pilih <strong>“Tambah ke Layar Utama”</strong>.</p></div>'+
          '<button type="button" class="install-banner-close" aria-label="Tutup">✕</button>'
        : '<div class="install-banner-icon">📲</div>'+
          '<div class="install-banner-body"><strong>Instal Akemat di HP Anda</strong>'+
          '<p>Akses lebih cepat, kerasa seperti aplikasi asli — tanpa perlu buka browser.</p></div>'+
          '<div class="install-banner-acts">'+
          '<button type="button" class="btn btn-primary btn-sm" id="btnInstallGo">Instal</button>'+
          '<button type="button" class="install-banner-close" aria-label="Tutup">✕</button>'+
          '</div>';
      document.body.appendChild(el);
      requestAnimationFrame(()=>el.classList.add('show'));
      el.querySelector('.install-banner-close')?.addEventListener('click', ()=>dismiss(14));
      return el;
    }

    if(isIOS){
      let navCount = 0;
      const onNav = ()=>{
        navCount++;
        if(navCount >= 2 && !banner){
          banner = buildBanner('ios');
          window.removeEventListener('hashchange', onNav);
        }
      };
      window.addEventListener('hashchange', onNav);
      return;
    }

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(()=>{
        if(!deferredPrompt || banner) return;
        banner = buildBanner('android');
        document.getElementById('btnInstallGo')?.addEventListener('click', async ()=>{
          haptic(15);
          banner.classList.remove('show');
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if(choice.outcome === 'accepted') setTimeout(()=>banner?.remove(), 300);
          else dismiss(14);
        });
      }, 2500); // beri jeda supaya tidak terasa "menyerbu" begitu halaman terbuka
    });

    window.addEventListener('appinstalled', ()=>{
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 365*86400000));
      banner?.remove();
    });
  })();
});
