'use strict';
// =========================================================
// Akemat Foundation v3 — SPA App
// =========================================================

// 2FA Panel Admin — bukti OTP WA (dari lib/otpProof.js lewat /api/fazpass-otp,
// dipakai ulang, lihat komentar di api/admin.js) disimpan di memori saja,
// bukan localStorage — hilang otomatis kalau tab ditutup/direfresh, dan
// kadaluarsa sendiri di server setelah 15 menit walau tab tetap terbuka.
let adminOtpProof = null;

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
};
function helpLinkRow(icon, label, href, external){
  return '<a href="'+href+'"'+(external?' target="_blank" rel="noopener noreferrer"':'')+' class="help-link-row">'+
    '<span style="display:flex;align-items:center;gap:12px;font-size:.88rem"><span class="help-link-icon">'+icon+'</span>'+label+'</span>'+
    '<span class="help-link-chevron">'+ICON.chevronRight+'</span></a>';
}
function pwFieldHTML(id, label, placeholder){
  return '<div class="ff"><label>'+label+'</label>'+
    '<div class="pw-field">'+
      '<input type="password" id="'+id+'" placeholder="'+placeholder+'" />'+
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

// ── Routing ────────────────────────────────────────────────
const app = document.getElementById('app');

function navigate(hash){ location.hash = hash; }

// Arah transisi disimpulkan dari jumlah "segmen" hash, bukan history stack
// eksplisit (routing berbasis hash tidak natural buat dilacak stack) —
// list→detail nambah 1 segmen ("perawat" → "perawat/id") kerasa "masuk lebih
// dalam" jadi slide dari kanan; detail→list kerasa "keluar" jadi slide dari
// kiri; sesama level (mis. ganti tab bawah) tetap fade netral seperti biasa.
let _prevHashParts = null;

async function route(){
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
    case 'perawat':  id ? await renderNurseDetail(id) : await renderNurseList(); break;
    case 'donasi':   id ? await renderCampaignDetail(id) : await renderCampaignList(); break;
    case 'login':    renderLogin();       break;
    case 'lupa-password': renderForgotPassword(); break;
    case 'register': renderRegister();    break;
    case 'dashboard':await renderDashboard();   break;
    case 'profil':   await renderProfile();     break;
    case 'tnc':      renderTNC();         break;
    case 'privasi':  renderPrivacyPolicy(); break;
    case 'faq':      renderFAQ();         break;
    case 'admin':    await renderAdminDash(); break;
    default:         await renderHome();
  }
  // Restart animasi tiap ganti halaman (class sudah ada = tidak replay
  // begitu saja, jadi dipaksa reflow di antara remove/add).
  app.classList.remove('page-transition','page-forward','page-back');
  void app.offsetWidth;
  app.classList.add(direction==='forward' ? 'page-forward' : direction==='back' ? 'page-back' : 'page-transition');
  window.scrollTo(0,0);
  trackPageView();
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

    ${renderFooterSection()}`;
  wireSpecGrid();
}

// ── Nurse List ─────────────────────────────────────────────
function filterNurses(list, { q, specialty, education, avail } = {}){
  let out = list;
  if (specialty && specialty !== 'Semua') out = out.filter(n => n.np.specialty === specialty);
  if (avail)     out = out.filter(n => n.np.avail);
  if (education && education !== 'Semua') out = out.filter(n => n.np.education === education);
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter(n => n.name.toLowerCase().includes(needle) || n.np.specialty.toLowerCase().includes(needle) || n.np.loc.toLowerCase().includes(needle));
  }
  return out;
}

function skeletonGrid(gridClass, n){
  return '<div class="'+gridClass+'">'+Array(n).fill('<div class="skel skel-card"></div>').join('')+'</div>';
}

async function renderNurseList(){
  app.innerHTML = '<section class="pub-section"><div class="container">'+skeletonGrid('nurse-grid', 6)+'</div></section>';
  const nurses = await Store.getNurses();
  const allNurses = nurses;
  // Datang dari kartu spesialisasi di Home? Pre-filter sekali, lalu buang (link
  // biasa ke #perawat berikutnya harus tampil semua lagi, bukan nyangkut ke-filter).
  const preSpec = sessionStorage.getItem('akemat_prefilter_spec') || '';
  if(preSpec) sessionStorage.removeItem('akemat_prefilter_spec');
  const initialList = preSpec ? filterNurses(nurses, { specialty: preSpec }) : nurses;

  app.innerHTML = `
  <section class="pub-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Temukan perawat</p>
        <h2>Perawat profesional siap hadir di rumah Anda</h2>
      </div>

      <div class="filter-row" id="nurseFilters">
        <div class="search-wrap">
          <span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input type="text" id="nurseSearch" placeholder="Cari nama, spesialisasi, kota…" />
        </div>
        <select id="nurseSpec">
          <option value="">Semua spesialisasi</option>
          ${SPECIALTIES.map(s=>'<option value="'+s+'"'+(s===preSpec?' selected':'')+'>'+s+'</option>').join('')}
        </select>
        <select id="nurseEdu">
          <option value="">Semua pendidikan</option>
          ${EDUCATION_LEVELS.map(e=>'<option value="'+e+'">'+e+'</option>').join('')}
        </select>
        <button class="f-chip" id="availFilterOn" data-avail="1">✓ Tersedia sekarang</button>
      </div>

      <div class="nurse-grid" id="nurseGrid">
        ${initialList.map(n=>nurseCard(n)).join('') || nurseEmptyState(allNurses.length)}
      </div>
    </div>
  </section>
  ${renderFooterSection()}`;

  // Filters
  let avail = false;
  const grid = ()=>{
    const q    = document.getElementById('nurseSearch')?.value || '';
    const spec = document.getElementById('nurseSpec')?.value   || '';
    const edu  = document.getElementById('nurseEdu')?.value    || '';
    const list = filterNurses(allNurses, { q, specialty: spec, education: edu, avail });
    document.getElementById('nurseGrid').innerHTML = list.map(n=>nurseCard(n)).join('') || nurseEmptyState(allNurses.length, true);
  };
  document.getElementById('nurseSearch')?.addEventListener('input', grid);
  document.getElementById('nurseSpec')?.addEventListener('change', grid);
  document.getElementById('nurseEdu')?.addEventListener('change', grid);
  enhanceSelect(document.getElementById('nurseSpec'), 'Spesialisasi');
  enhanceSelect(document.getElementById('nurseEdu'), 'Pendidikan');
  document.getElementById('availFilterOn')?.addEventListener('click', ()=>{
    avail = !avail;
    document.getElementById('availFilterOn').classList.toggle('active', avail);
    grid();
  });
  document.getElementById('nurseGrid')?.addEventListener('click', (ev)=>{
    if(ev.target.id === 'btnResetNurseFilters'){
      document.getElementById('nurseSearch').value = '';
      const specEl = document.getElementById('nurseSpec'), eduEl = document.getElementById('nurseEdu');
      specEl.value = ''; specEl.dispatchEvent(new Event('change', { bubbles: true }));
      eduEl.value  = ''; eduEl.dispatchEvent(new Event('change', { bubbles: true }));
      avail = false;
      document.getElementById('availFilterOn')?.classList.remove('active');
      grid();
    }
  });
}

// Kosongnya "belum ada perawat sama sekali" vs "tidak ada yang cocok dengan
// filter aktif" butuh pesan & aksi yang beda supaya pengguna tahu harus
// ngapain, bukan cuma mentok di ikon kotak surat.
function nurseEmptyState(totalNurses, isFiltered){
  if(totalNurses === 0){
    return '<div class="empty-state"><div class="empty-icon">👩‍⚕️</div>'
      + '<p>Belum ada perawat terdaftar di platform saat ini.</p>'
      + '<p style="font-size:.82rem;margin-top:4px">Butuh bantuan segera? Hubungi tim Akemat, kami bantu carikan.</p>'
      + '<a href="https://wa.me/6285196407117" target="_blank" class="btn btn-primary btn-sm" style="margin-top:14px">💬 Hubungi via WhatsApp</a>'
      + '</div>';
  }
  if(isFiltered){
    return '<div class="empty-state"><div class="empty-icon">🔍</div>'
      + '<p>Tidak ada perawat yang cocok dengan filter ini.</p>'
      + '<button type="button" class="btn btn-outline btn-sm" id="btnResetNurseFilters" style="margin-top:14px">Reset Filter</button>'
      + '</div>';
  }
  return emptyState('Tidak ada perawat yang cocok.');
}

function nurseCard(n){
  const p = n.np;
  return `
  <div class="nurse-card">
    <div class="nc-head">
      <div class="nc-avatar">${initials(n.name)}${p.verified?'<span class="nc-verified"></span>':''}</div>
      <div class="nc-meta">
        <div class="nc-name">${esc(n.name)}</div>
        ${specBadge(p.specialty)}
        <div class="nc-edu" style="margin-top:4px">🎓 ${esc(p.education||'')}</div>
        <div class="${p.avail?'nc-avail-y':'nc-avail-n'}" style="margin-top:4px">
          ${p.avail?'✅ Tersedia':'⏸ Tidak tersedia'}
        </div>
      </div>
    </div>
    <div class="nc-stats">
      <span class="nc-stat"><span class="star">★</span>${p.rating} (${p.reviews} ulasan)</span>
      <span class="nc-stat">📍 ${esc(p.loc)}</span>
      <span class="nc-stat">🏥 ${p.exp} tahun</span>
    </div>
    <div class="nc-svcs">${(p.services||[]).slice(0,3).map(s=>'<span class="svc-chip">'+esc(s)+'</span>').join('')}</div>
    <div class="nc-price">${rpFmt(p.price)} <small>/ jam</small></div>
    <div class="nc-actions">
      <a href="#perawat/${n.id}" class="btn btn-outline btn-sm">Lihat profil</a>
      ${p.avail?'<button class="btn btn-primary btn-sm" onclick="openBookingModal(\''+n.id+'\')">Buat Janji</button>':'<button class="btn btn-ghost btn-sm" disabled>Tidak tersedia</button>'}
    </div>
  </div>`;
}

// ── Nurse Detail ────────────────────────────────────────────
async function renderNurseDetail(id){
  const n = await Store.getUserById(id);
  if(!n || !n.np){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Perawat tidak ditemukan.</p></div>'; return; }
  const p = n.np;
  const currentUser = Store.getCurrentUser();
  const patientProfiles = currentUser?.role==='patient' ? await Store.getPatientProfiles(currentUser.id) : [];
  const reviews = await Store.getReviewsByNurse(n.id);
  const bookableProfiles = patientProfiles.filter(pp => pp.ktpStatus === 'uploaded' || pp.ktpStatus === 'verified');

  app.innerHTML = `
  <div class="container nurse-detail-wrap">
    <div>
      <div class="nurse-profile-card">
        <div class="npro-head">
          <div class="npro-big-avatar">${initials(n.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="npro-name">${esc(n.name)}</div>
            <div class="npro-spec">${specBadge(p.specialty)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">
              <span class="badge badge-blue">🎓 ${esc(p.education)}</span>
              ${p.verified?'<span class="badge badge-green">'+ICON.check+' Terverifikasi</span>':'<span class="badge badge-amber">Menunggu verifikasi</span>'}
              <span class="${p.avail?'badge badge-green':'badge badge-amber'}">${p.avail?'✅ Tersedia':'⏸ Tidak tersedia'}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:20px;margin-top:16px;flex-wrap:wrap">
          <div class="nc-stat"><span class="star">★</span><strong>${p.rating}</strong> (${p.reviews} ulasan)</div>
          <div class="nc-stat">📍 ${esc(p.loc)}</div>
          <div class="nc-stat">🏥 Pengalaman ${p.exp} tahun</div>
          <div class="nc-stat">💰 ${rpFmt(p.price)}/jam</div>
        </div>
        <div class="cam-share-row" style="margin-top:14px;margin-bottom:0">
          <button class="btn btn-outline btn-sm" id="btnShareNurse" type="button">🔗 Bagikan Profil</button>
          <a class="btn btn-sm share-wa" id="shareNurseWaLink" target="_blank" rel="noopener noreferrer">💬 Rekomendasikan via WhatsApp</a>
        </div>
      </div>

      <div class="nurse-profile-card">
        <div class="tabs" id="nurseTabs">
          <button class="tab-btn active" data-tab="bio">Tentang</button>
          <button class="tab-btn" data-tab="svc">Layanan</button>
          <button class="tab-btn" data-tab="jadwal">Jadwal</button>
          <button class="tab-btn" data-tab="ulasan">Ulasan</button>
        </div>
        <div class="tab-pane active" id="tab-bio">
          <p>${esc(p.bio)}</p>
        </div>
        <div class="tab-pane" id="tab-svc">
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(p.services||[]).map(s=>'<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-alt);border-radius:8px"><span style="color:var(--success)">✓</span><span style="font-weight:600;font-size:.9rem">'+esc(s)+'</span></div>').join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-jadwal">
          <p style="margin-bottom:10px;font-size:.88rem;color:var(--soft)">Hari-hari perawat tersedia untuk kunjungan:</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=>{var on=(p.schedule||[]).includes(d);return '<span style="padding:8px 14px;border-radius:8px;font-size:.82rem;font-weight:600;font-family:var(--font-d);background:'+(on?'var(--primary)':'var(--bg-alt)')+';color:'+(on?'#fff':'var(--soft)')+'">'+d+'</span>';}).join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-ulasan">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${reviews.length ? reviews.map(function(r){
              var stars='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);
              return '<div style="padding:14px;background:var(--bg-alt);border-radius:10px">'+
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
                '<span style="font-weight:700;font-size:.86rem">'+esc(r.patientName)+'</span>'+
                '<span style="font-size:.76rem;color:var(--soft)">'+esc(r.createdAt)+'</span></div>'+
                '<div style="color:#F59E0B;font-size:.84rem;margin-bottom:5px">'+stars+'</div>'+
                (r.comment?'<p style="font-size:.88rem;margin:0">'+esc(r.comment)+'</p>':'')+'</div>';
            }).join('') : '<p style="color:var(--soft);font-size:.88rem">Belum ada ulasan untuk perawat ini.</p>'}
          </div>
        </div>
      </div>
    </div>

    <!-- Booking widget -->
    <div>
      <div class="book-widget">
        <h3>Buat Janji Temu dengan ${esc(n.name.split(',')[0])}</h3>
        <div class="book-price">${rpFmt(p.price)} <small>/ jam</small></div>

        ${!p.avail ? '<div class="bank-warning">⚠️ Perawat ini sedang tidak tersedia. Coba cari perawat lain.</div>' : ''}

        ${currentUser?.role==='patient' ? (
          bookableProfiles.length
            ? '<div class="ff"><label>Untuk pasien</label><select id="bkPatientProfile">'+bookableProfiles.map(pp=>'<option value="'+pp.id+'">'+esc(pp.name)+' ('+esc(pp.relationship)+')'+(pp.ktpStatus!=='verified'?' — menunggu verifikasi KTP':'')+'</option>').join('')+'</select></div>'
            : '<div class="bank-warning">⚠️ Anda belum punya profil pasien dengan KTP terunggah. <a href="#profil">Tambahkan di halaman Profil</a> dulu sebelum membuat janji temu.</div>'
        ) : ''}

        <div class="ff">
          <label>Tanggal kunjungan</label>
          <input type="date" id="bkDate" min="${new Date(Date.now()+86400000).toISOString().split('T')[0]}" />
        </div>
        <div class="ff">
          <label>Jam mulai</label>
          <div class="time-grid">
            ${['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map((t,i)=>'<button class="time-btn'+(i===0?' active':'')+'" data-time="'+t+'">'+t+'</button>').join('')}
          </div>
        </div>
        <div class="ff">
          <label>Durasi</label>
          <div class="dur-row">
            ${[1,2,3,4,8].map((d,i)=>'<button class="dur-btn'+(i===1?' active':'')+'" data-dur="'+d+'">'+(d===8?'Full':d+'j')+'</button>').join('')}
          </div>
        </div>
        <div class="ff">
          <label>Jenis layanan</label>
          <select id="bkService">
            ${(p.services||[p.specialty]).map(s=>'<option value="'+s+'">'+s+'</option>').join('')}
          </select>
        </div>
        <div class="ff">
          <label>Alamat kunjungan</label>
          <input type="text" id="bkAddress" placeholder="Jl. Nama No. X, Kota" />
        </div>
        <div class="ff">
          <label>Catatan (opsional)</label>
          <textarea id="bkNotes" rows="2" placeholder="Kondisi pasien, kebutuhan khusus…"></textarea>
        </div>

        <div class="ff">
          <label>Kode promo (opsional)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="bkPromoCode" placeholder="Masukkan kode" style="flex:1;text-transform:uppercase" />
            <button type="button" class="btn btn-outline btn-sm" id="btnApplyPromo">Terapkan</button>
          </div>
          <div id="bkPromoMsg" style="font-size:.78rem;margin-top:6px"></div>
        </div>

        <!-- Fee breakdown -->
        <div class="fee-box">
          <div class="fee-row">
            <span class="fee-label">Harga perawat</span>
            <span class="fee-value" id="bkPriceBase">${rpFmt(p.price)} × 2 jam</span>
          </div>
          <div class="fee-row fee-discount" id="bkDiscountRow" style="display:none">
            <span class="fee-label">Diskon promo</span>
            <span id="bkDiscount" style="color:#059669">-Rp0</span>
          </div>
          <div class="fee-row fee-total">
            <span>Total bayar</span>
            <span id="bkTotal">${rpFmt(p.price*2)}</span>
          </div>
          <div class="fee-row fee-platform">
            <span class="fee-label">Platform fee (20%)</span>
            <span id="bkFee">${rpFmt(p.price*2*0.2)}</span>
          </div>
          <div class="fee-row fee-net">
            <span class="fee-label">Perawat terima</span>
            <span id="bkNursePay">${rpFmt(p.price*2*0.8)}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="btnBook" ${!p.avail?'disabled':''}>
          Buat Janji Temu
        </button>
        <p style="font-size:.72rem;color:var(--soft);text-align:center;margin-top:8px;line-height:1.5">
          Pembayaran dikonfirmasi via WhatsApp setelah janji temu dibuat. 
          <a href="#tnc">Syarat & Ketentuan</a> berlaku.
        </p>
      </div>
    </div>
  </div>
  ${renderFooterSection()}`;

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');
    });
  });

  // ── Bagikan / rekomendasikan profil perawat ──────────────
  const nurseShareUrl  = location.origin + location.pathname + '#perawat/' + n.id;
  const nurseShareText = 'Saya mau rekomendasikan perawat '+n.name.split(',')[0]+' ('+p.specialty+') di Akemat Foundation. Cek profilnya di sini:';
  const nurseWaLink = document.getElementById('shareNurseWaLink');
  if(nurseWaLink) nurseWaLink.href = 'https://wa.me/?text=' + encodeURIComponent(nurseShareText + ' ' + nurseShareUrl);
  document.getElementById('btnShareNurse')?.addEventListener('click', async ()=>{
    if(navigator.share){
      try { await navigator.share({ title: n.name, text: nurseShareText, url: nurseShareUrl }); }
      catch(e){ /* pengguna batal share, abaikan */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(nurseShareUrl);
      toast('Link profil perawat disalin! Tempel di chat/medsos manapun.','s');
    } catch {
      toast('Gagal menyalin link. Salin manual: '+nurseShareUrl,'e');
    }
  });

  // Duration / time selection
  let selDur = 2;
  let appliedPromo = null; // { code, discount, finalAmount } — direset tiap durasi berubah
  document.querySelectorAll('.dur-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selDur = parseInt(btn.dataset.dur);
      appliedPromo = null;
      const msg = document.getElementById('bkPromoMsg');
      if(msg) msg.textContent = '';
      updateBookCalc();
    });
  });
  document.querySelectorAll('.time-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function updateBookCalc(){
    const gross = p.price * selDur;
    const total = appliedPromo ? appliedPromo.finalAmount : gross;
    const fee   = Math.round(total * FEE.BOOKING);
    document.getElementById('bkPriceBase').textContent = rpFmt(p.price)+' × '+selDur+' jam';
    document.getElementById('bkTotal').textContent     = rpFmt(total);
    document.getElementById('bkFee').textContent       = rpFmt(fee);
    document.getElementById('bkNursePay').textContent  = rpFmt(total - fee);
    const discRow = document.getElementById('bkDiscountRow');
    if(discRow) discRow.style.display = appliedPromo ? '' : 'none';
    if(appliedPromo) document.getElementById('bkDiscount').textContent = '-'+rpFmt(appliedPromo.discount);
  }
  updateBookCalc();

  document.getElementById('btnApplyPromo')?.addEventListener('click', async ()=>{
    const input = document.getElementById('bkPromoCode');
    const msg   = document.getElementById('bkPromoMsg');
    const code  = input?.value.trim();
    if(!code){ if(msg){ msg.textContent='Isi kode promo dulu.'; msg.style.color='#DC2626'; } return; }
    const btn = document.getElementById('btnApplyPromo');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengecek…';
    try {
      const gross = p.price * selDur;
      const r = await Store.checkPromo(code, gross, 'booking');
      appliedPromo = { code: r.code, discount: r.discount, finalAmount: r.finalAmount };
      if(msg){ msg.textContent = '✓ Kode "'+r.code+'" diterapkan — hemat '+rpFmt(r.discount)+'.'; msg.style.color = '#059669'; }
      updateBookCalc();
    } catch(e) {
      appliedPromo = null;
      if(msg){ msg.textContent = e.message || 'Kode promo tidak valid.'; msg.style.color = '#DC2626'; }
      updateBookCalc();
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Book button
  document.getElementById('btnBook')?.addEventListener('click', async (ev)=>{
    if(ev.currentTarget.disabled) return;
    const u = Store.getCurrentUser();
    if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
    if(u.role !== 'patient'){ toast('Hanya pasien yang bisa membuat janji temu dengan perawat.','e'); return; }
    const patientProfileId = document.getElementById('bkPatientProfile')?.value;
    if(!patientProfileId){ toast('Tambahkan profil pasien (dengan KTP) di halaman Profil terlebih dahulu.','e'); return; }
    const patientProfileName = bookableProfiles.find(pp=>pp.id===patientProfileId)?.name || '';
    const date    = document.getElementById('bkDate')?.value;
    const time    = document.querySelector('.time-btn.active')?.dataset.time || '09:00';
    const dur     = selDur;
    const service = document.getElementById('bkService')?.value || p.specialty;
    const address = document.getElementById('bkAddress')?.value.trim();
    const notes   = document.getElementById('bkNotes')?.value.trim();
    if(!date)    { toast('Pilih tanggal kunjungan.','e'); return; }
    if(!address) { toast('Isi alamat kunjungan.','e'); return; }

    const total = p.price * dur;
    const btn2 = document.getElementById('btnBook');
    const orig2 = btn2?.textContent;
    if(btn2){ btn2.disabled=true; btn2.textContent='Memproses…'; }
    let booking;
    try {
      booking = await Store.addBooking({
        patientId: u.id, nurseId: n.id, patientProfileId, patientProfileName,
        nurseName: n.name, nurseSpecialty: p.specialty,
        service, date, time, duration: dur, address, notes,
        totalCost: total,
        promoCode: appliedPromo?.code || undefined,
      });
    } catch(e) {
      toast('Gagal membuat janji temu: '+(e.message||'coba lagi.'), 'e');
      if(btn2){ btn2.disabled=false; btn2.textContent=orig2; }
      return;
    }
    if(btn2) btn2.textContent = 'Memproses pembayaran…';
    try {
      await Payment.payBooking({
        bookingId:   booking.id,
        totalCost:   booking.totalCost,
        nurseName:   n.name,
        service,
        buyerName:   u.name,
        buyerEmail:  u.email,
        buyerPhone:  u.phone||'08000000000',
      });
    } catch(err){
      // Janji temu tersimpan (belum lunas) tapi redirect ke DOKU gagal — tampilkan
      // alasan sebenarnya, jangan sembunyikan di balik pesan sukses yang menyesatkan.
      toast('Janji temu tersimpan, tapi gagal membuka pembayaran: '+(err.message||'coba lagi.'), 'e');
      setTimeout(()=>navigate('#dashboard'), 1800);
      console.error('[Payment] DOKU redirect failed:', err.message);
    }
    if(btn2){ btn2.disabled=false; btn2.textContent=orig2; }
  });
}

// ── Campaign List ───────────────────────────────────────────
async function renderCampaignList(){
  app.innerHTML = '<section class="pub-section"><div class="container">'+skeletonGrid('campaign-grid', 6)+'</div></section>';
  const campaigns = await Store.getCampaigns();
  app.innerHTML = `
  <section class="pub-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Campaign donasi</p>
        <h2>Bantu mereka yang membutuhkan perawatan</h2>
      </div>
      <div class="filter-row">
        <div class="search-wrap">
          <span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input type="text" id="camSearch" placeholder="Cari campaign…" />
        </div>
      </div>
      <div class="campaign-grid" id="camGrid">
        ${campaigns.map(c=>campaignCard(c)).join('') || emptyState('Belum ada campaign.')}
      </div>
      ${Store.getCurrentUser()?.role==='donor'?'<div style="text-align:center;margin-top:32px"><button class="btn btn-accent" onclick="openCreateCampaignModal()">+ Buat Campaign Baru</button></div>':''}
    </div>
  </section>
  ${renderFooterSection()}`;

  document.getElementById('camSearch')?.addEventListener('input', filterCam);
  function filterCam(){
    const q  = document.getElementById('camSearch')?.value.toLowerCase()||'';
    const list = campaigns.filter(c=>!q || c.title.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
    document.getElementById('camGrid').innerHTML = list.map(c=>campaignCard(c)).join('') || emptyState('Tidak ada campaign yang cocok.');
  }
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

// ── Campaign Detail ─────────────────────────────────────────
async function renderCampaignDetail(id){
  const c = await Store.getCampaignById(id);
  if(!c){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Campaign tidak ditemukan.</p></div>'; return; }
  const p    = pct(c.current, c.target);
  const cls  = p>=100?'high':p>=80?'urgent':'';
  const doms = (await Store.getDonationsByCampaign(id)).slice(-5).reverse();

  app.innerHTML = `
  <div class="container cam-detail-wrap">
    <div>
      <div class="cam-story-card">
        ${c.imageUrl?'<img src="'+c.imageUrl+'" alt="Foto campaign '+esc(c.title)+'" class="cam-cover-img" loading="lazy" />':''}
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:18px">
          <div>${specBadge(c.category||'Donasi')}</div>
          ${c.verified?'<span class="badge badge-green">'+ICON.check+' Campaign Terverifikasi</span>':'<span class="badge badge-amber">Belum terverifikasi</span>'}
        </div>
        <h2 style="font-size:1.3rem;margin-bottom:16px">${esc(c.title)}</h2>
        <p style="font-size:.82rem;color:var(--soft);margin-bottom:6px">Campaign oleh <strong>${esc(c.creatorName)}</strong> · Deadline: ${esc(c.deadline)}</p>
        <div class="cam-share-row">
          <button class="btn btn-outline btn-sm" id="btnShareCampaign" type="button">🔗 Bagikan Campaign</button>
          <a class="btn btn-sm share-wa" id="shareWaLink" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
        </div>

        <!-- Campaign penerima dana — nomor rekening TIDAK ditampilkan ke publik.
             Semua donasi wajib lewat payment gateway platform (DOKU), bukan
             transfer langsung, jadi pengunjung cukup tahu program terverifikasi
             + atas nama siapa dananya, tanpa data rekening mentah. -->
        <div style="background:var(--bg-alt);border-radius:var(--r-sm);padding:14px;margin-bottom:18px">
          <h4 style="font-family:var(--font-d);font-weight:700;font-size:.85rem;margin:0 0 8px;color:var(--primary)">🏦 Penerima Dana Campaign</h4>
          ${c.bankInfo?.accountNumber
            ? '<div><span style="font-size:.76rem;color:var(--soft);display:block">Atas Nama</span><strong>'+esc(c.bankInfo.accountName)+'</strong></div>'+
               (c.bankInfo.verified?'<span class="bank-status verified" style="margin-top:8px;display:inline-flex">✓ Program sudah terverifikasi</span>':'<span class="bank-status pending" style="margin-top:8px;display:inline-flex">⏳ Program menunggu verifikasi</span>')+
               '<p style="margin:8px 0 0;font-size:.74rem;color:var(--soft)">Donasi diproses aman lewat payment gateway resmi Akemat Foundation, bukan transfer langsung ke rekening pribadi.</p>'
            : '<p style="margin:0;font-size:.84rem;color:var(--soft)">Menunggu kelengkapan data penerima. Dana akan dicairkan setelah verifikasi selesai.</p>'}
        </div>

        <h3 style="margin-bottom:12px">Cerita Campaign</h3>
        <div class="cam-story"><p>${esc(c.story)}</p></div>
      </div>
    </div>

    <!-- Donate widget -->
    <div>
      <div class="donate-widget">
        <div class="cam-progress-big">
          <div class="dw-raised">${rpFmt(c.current)}</div>
          <div style="font-size:.82rem;color:var(--soft);margin-bottom:10px">terkumpul dari target ${rpFmt(c.target)}</div>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${p}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:.78rem;color:var(--soft)">
            <span>${p}% tercapai</span>
            <span>${daysLeft(c.deadline)}</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;font-size:.82rem">
          <span><strong>${c.donorCount}</strong> donatur</span>
          <span>•</span>
          <span style="color:${p>=100?'var(--success)':'var(--soft)'}">${p>=100?'✅ Target tercapai!':'Butuh '+rpFmt(c.target-c.current)+' lagi'}</span>
        </div>
        <button class="btn btn-accent btn-full" onclick="openDonateModal('${c.id}')">Donasi Sekarang ❤️</button>

        ${doms.length?'<div class="donors-list"><h4 style="font-family:var(--font-d);font-weight:700;font-size:.84rem;margin:0 0 10px">Donatur terakhir</h4>'+doms.map(d=>'<div class="donor-item"><span class="donor-name">'+(d.anonymous?'Anonim':esc(d.donorName))+'</span><span class="donor-amount">'+rpFmt(d.amount)+'</span></div>').join('')+'</div>':''}      </div>
    </div>
  </div>
  ${renderFooterSection()}`;

  // ── Share campaign ──────────────────────────────────────
  const shareUrl  = location.origin + location.pathname + '#donasi/' + c.id;
  const shareText = 'Yuk bantu wujudkan "' + c.title + '" di Akemat Foundation. Sudah terkumpul ' + rpFmt(c.current) + ' dari target ' + rpFmt(c.target) + '.';
  const waLink = document.getElementById('shareWaLink');
  if(waLink) waLink.href = 'https://wa.me/6285196407117?text=' + encodeURIComponent('Halo Akemat Foundation, saya ingin tanya soal campaign "' + c.title + '" — ' + shareUrl);
  document.getElementById('btnShareCampaign')?.addEventListener('click', async ()=>{
    if(navigator.share){
      try { await navigator.share({ title: c.title, text: shareText, url: shareUrl }); }
      catch(e){ /* pengguna batal share, abaikan */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Link campaign disalin! Tempel di chat/medsos manapun.','s');
    } catch {
      toast('Gagal menyalin link. Salin manual: '+shareUrl,'e');
    }
  });
}

// ── Auth ────────────────────────────────────────────────────
function renderLogin(){
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Masuk ke Akemat</h2>
      <p class="lead">Masuk ke akun Akemat Foundation Anda.</p>
      <div class="ff"><label>Email atau No. HP</label><input type="text" id="loginEmail" placeholder="email@anda.com atau 08xx…" /></div>
      ${pwFieldHTML('loginPass','Password','••••••••')}
      <div class="form-error" id="loginErr"></div>
      <button class="btn btn-primary btn-full" id="btnLogin" style="margin-top:12px">Masuk</button>
      <div style="text-align:center;margin-top:14px;font-size:.84rem;color:var(--soft)">
        Belum punya akun? <a href="#register" style="color:var(--accent2);font-weight:700">Daftar sekarang →</a>
      </div>
      <div style="text-align:center;margin-top:8px;font-size:.84rem">
        <a href="#lupa-password" style="color:var(--soft)">Lupa password?</a>
      </div>
    </div>
  </div>`;

  document.getElementById('btnLogin')?.addEventListener('click',async ()=>{
    const identifier = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPass')?.value;
    const err   = document.getElementById('loginErr');
    const btn   = document.getElementById('btnLogin');
    if(btn.disabled) return;
    if(!identifier||!pass){ err.textContent = 'Isi email/No. HP dan password.'; return; }
    err.textContent = '';
    btn.disabled = true;
    try {
      const u = await Store.login(identifier, pass);
      toast('Selamat datang, '+u.name.split(' ')[0]+'!','s');
      navigate('#home');
    } catch(e) {
      err.textContent = e.message || 'Email/No. HP atau password salah.';
    } finally {
      btn.disabled = false;
    }
  });

  // Enter key
  document.addEventListener('keydown', function onEnter(e){
    if(e.key === 'Enter' && document.getElementById('loginEmail')){
      document.getElementById('btnLogin')?.click();
      document.removeEventListener('keydown', onEnter);
    }
  });
}

function renderForgotPassword(){
  let otpRequestId = null;
  let verifiedPhone = null;
  let otpProof = null;

  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Lupa Password</h2>
      <p class="lead">Verifikasi nomor HP terdaftar via WhatsApp untuk atur ulang password.</p>

      <div id="fpStep1">
        <div class="ff"><label>No. HP terdaftar</label><input type="tel" id="fpPhone" placeholder="08xx…" /></div>
        <button class="btn btn-primary btn-full" id="btnFpSendOtp" style="margin-top:8px">Kirim OTP WA</button>
      </div>

      <div id="fpStep2" style="display:none;margin-top:14px">
        <div class="ff">
          <label>Kode OTP WhatsApp</label>
          <input type="text" id="fpOtpCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="letter-spacing:.3em" />
        </div>
        <button class="btn btn-primary btn-full" id="btnFpVerifyOtp">Verifikasi Kode</button>
      </div>

      <div id="fpStep3" style="display:none;margin-top:14px">
        ${pwFieldHTML('fpNewPass','Password baru','Min. 8 karakter, bukan cuma angka')}
        ${pwFieldHTML('fpNewPass2','Konfirmasi password baru','Ulangi password baru')}
        <button class="btn btn-primary btn-full" id="btnFpSavePass">Simpan Password Baru</button>
      </div>

      <div class="form-error" id="fpErr"></div>
      <div style="text-align:center;margin-top:14px;font-size:.84rem;color:var(--soft)">
        <a href="#login" style="color:var(--accent2);font-weight:700">← Kembali ke Masuk</a>
      </div>
    </div>
  </div>`;

  document.getElementById('btnFpSendOtp')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('fpErr');
    const phone = document.getElementById('fpPhone')?.value.trim();
    const btn   = document.getElementById('btnFpSendOtp');
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    if(btn.disabled) return; // cegah klik ganda memicu 2 request OTP sekaligus
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      if(!(await Store.getUserByPhone(phone))){ err.textContent = 'Nomor HP tidak terdaftar.'; return; }
      btn.textContent = 'Mengirim…';
      otpRequestId = await Otp.send(phone);
      verifiedPhone = phone;
      document.getElementById('fpStep1').style.display = 'none';
      document.getElementById('fpStep2').style.display = 'block';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  document.getElementById('btnFpVerifyOtp')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('fpErr');
    const code = document.getElementById('fpOtpCode')?.value.trim();
    err.textContent = '';
    if(!code){ err.textContent = 'Masukkan kode OTP.'; return; }
    const btn = document.getElementById('btnFpVerifyOtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      otpProof = await Otp.verify(otpRequestId, code, verifiedPhone);
      document.getElementById('fpStep2').style.display = 'none';
      document.getElementById('fpStep3').style.display = 'block';
      toast('Nomor HP terverifikasi. Silakan atur password baru.','s');
    } catch(e){
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
    }
    btn.disabled = false; btn.textContent = orig;
  });

  document.getElementById('btnFpSavePass')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('fpErr');
    const pass  = document.getElementById('fpNewPass')?.value;
    const pass2 = document.getElementById('fpNewPass2')?.value;
    err.textContent = '';
    if(!verifiedPhone){ err.textContent = 'Verifikasi OTP terlebih dahulu.'; return; }
    const pwErr = passwordStrengthError(pass);
    if(pwErr){ err.textContent = pwErr; return; }
    if(pass !== pass2){ err.textContent = 'Konfirmasi password tidak cocok.'; return; }
    const btn = document.getElementById('btnFpSavePass');
    btn.disabled = true;
    try {
      await Store.resetPassword({ phone: verifiedPhone, proof: otpProof, newPassword: pass });
      toast('Password berhasil diubah. Silakan masuk.','s');
      navigate('#login');
    } catch(e) {
      err.textContent = e.message || 'Gagal mengubah password.';
      btn.disabled = false;
    }
  });
}

function renderRegister(){
  let selRole = 'patient';
  let phoneVerified = false;
  let otpRequestId  = null;
  let verifiedPhone = '';
  let otpProof      = null;
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Daftar ke Akemat</h2>
      <p class="lead">Pilih peran Anda di platform.</p>
      <div class="role-pick-grid">
        <div class="role-pick active" data-role="patient">
          <div class="role-pick-icon">🏠</div>
          <div class="role-pick-name">Pasien</div>
          <div class="role-pick-desc">Cari &amp; buat janji temu dengan perawat</div>
        </div>
        <div class="role-pick" data-role="nurse">
          <div class="role-pick-icon">👨‍⚕️</div>
          <div class="role-pick-name">Perawat</div>
          <div class="role-pick-desc">Tawarkan jasa</div>
        </div>
        <div class="role-pick" data-role="donor">
          <div class="role-pick-icon">❤️</div>
          <div class="role-pick-name">Penggalang Dana</div>
          <div class="role-pick-desc">Buat &amp; kelola campaign donasi</div>
        </div>
      </div>

      <div class="ff"><label>Nama lengkap</label><input type="text" id="regName" placeholder="Nama sesuai KTP" /></div>
      <div class="ff row2">
        <div><label>Email</label><input type="email" id="regEmail" placeholder="email@anda.com" /></div>
        <div>
          <label>No. HP</label>
          <div style="display:flex;gap:8px">
            <input type="tel" id="regPhone" placeholder="08xx…" style="flex:1" />
            <button type="button" class="btn btn-outline btn-sm" id="btnSendOtp" style="white-space:nowrap">Kirim OTP WA</button>
          </div>
        </div>
      </div>
      <div class="ff" id="otpSection" style="display:none">
        <label>Kode OTP WhatsApp</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="regOtpCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="flex:1;letter-spacing:.3em" />
          <button type="button" class="btn btn-primary btn-sm" id="btnVerifyOtp" style="white-space:nowrap">Verifikasi</button>
        </div>
        <p style="font-size:.74rem;color:var(--soft);margin:6px 0 0" id="otpStatus">Kode dikirim via WhatsApp ke nomor di atas.</p>
      </div>
      ${pwFieldHTML('regPass','Password','Min. 8 karakter, bukan cuma angka')}

      <!-- Nurse extra -->
      <div id="nurseExtra" style="display:none">
        <div class="ff">
          <label>Spesialisasi</label>
          <select id="regSpecialty">
            ${SPECIALTIES.map(s=>'<option value="'+s+'">'+SPECIALTY_ICONS[s]+' '+s+'</option>').join('')}
          </select>
        </div>
        <div class="ff">
          <label>Pendidikan</label>
          <select id="regEducation">
            ${EDUCATION_LEVELS.map(e=>'<option value="'+e+'">'+e+'</option>').join('')}
          </select>
        </div>
        <div class="ff"><label>Kota domisili</label><input type="text" id="regLoc" placeholder="Bogor" /></div>
        <div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="regPrice" placeholder="150000" min="50000" /></div>
        <div class="ff"><label>Bio singkat</label><textarea id="regBio" rows="3" placeholder="Pengalaman, sertifikasi, keunggulan Anda…"></textarea></div>
      </div>

      <div class="form-error" id="regErr"></div>
      <button class="btn btn-primary btn-full" id="btnRegister" style="background:#1F4D3F !important;color:#FFFFFF !important;font-size:1rem;padding:14px;letter-spacing:.03em;font-weight:800;box-shadow:0 2px 8px rgba(31,77,63,.3)">Daftar Sekarang</button>
      <div style="text-align:center;margin-top:12px;font-size:.82rem;color:var(--soft)">
        Sudah punya akun? <a href="#login">Masuk</a>
      </div>
      <div style="text-align:center;margin-top:10px;font-size:.74rem;color:var(--soft)">
        Dengan mendaftar, Anda menyetujui <a href="#tnc">Syarat &amp; Ketentuan</a> dan <a href="#privasi">Kebijakan Privasi</a> kami.
      </div>
    </div>
  </div>`;

  function updateRoleUI(){
    document.getElementById('nurseExtra').style.display  = selRole==='nurse'?'block':'none';
  }
  document.querySelectorAll('.role-pick').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.role-pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selRole = btn.dataset.role;
      updateRoleUI();
    });
  });
  updateRoleUI();

  // Reset verifikasi jika nomor HP diubah setelah terverifikasi
  document.getElementById('regPhone')?.addEventListener('input',()=>{
    if(phoneVerified && document.getElementById('regPhone').value.trim() !== verifiedPhone){
      phoneVerified = false;
      document.getElementById('otpSection').style.display = 'none';
      document.getElementById('btnSendOtp').textContent = 'Kirim OTP WA';
    }
  });

  document.getElementById('btnSendOtp')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('regErr');
    const phone = document.getElementById('regPhone')?.value.trim();
    const btn = document.getElementById('btnSendOtp');
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    if(btn.disabled) return; // cegah klik ganda memicu 2 request OTP sekaligus
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      otpRequestId = await Otp.send(phone);
      verifiedPhone = phone;
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('otpStatus').textContent = 'Kode dikirim via WhatsApp ke '+phone+'.';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  document.getElementById('btnVerifyOtp')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('regErr');
    const code = document.getElementById('regOtpCode')?.value.trim();
    err.textContent = '';
    if(!otpRequestId){ err.textContent = 'Kirim kode OTP terlebih dahulu.'; return; }
    if(!code){ err.textContent = 'Masukkan kode OTP.'; return; }
    const btn = document.getElementById('btnVerifyOtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      otpProof = await Otp.verify(otpRequestId, code, verifiedPhone);
      phoneVerified = true;
      document.getElementById('otpStatus').textContent = '✅ Nomor HP terverifikasi.';
      toast('Nomor HP berhasil diverifikasi.','s');
    } catch(e){
      phoneVerified = false;
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
    }
    btn.disabled = false; btn.textContent = orig;
  });

  document.getElementById('btnRegister')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('regErr');
    const name = document.getElementById('regName')?.value.trim();
    const email= document.getElementById('regEmail')?.value.trim();
    const phone= document.getElementById('regPhone')?.value.trim();
    const pass = document.getElementById('regPass')?.value;

    if(!name||!email||!phone||!pass){ err.textContent='Lengkapi semua field wajib.'; return; }
    const pwErr = passwordStrengthError(pass);
    if(pwErr){ err.textContent = pwErr; return; }
    if(Store.backend==='local' && DB.getUserByEmail(email)){ err.textContent='Email sudah terdaftar.'; return; }
    if(!phoneVerified || phone !== verifiedPhone){ err.textContent='Verifikasi No. HP via WhatsApp (OTP) terlebih dahulu.'; return; }

    // Rekening pencairan & KTP dilengkapi belakangan dari halaman Profil.
    const userData = {
      name, email, phone, password: pass, role: selRole, phoneVerified: true,
      bankInfo: { bankName:'', accountNumber:'', accountName:'', verified:false },
      ktpStatus: 'pending',
    };

    if(selRole === 'nurse'){
      const spec  = document.getElementById('regSpecialty')?.value;
      const edu   = document.getElementById('regEducation')?.value;
      const loc   = document.getElementById('regLoc')?.value.trim();
      const price = parseInt(document.getElementById('regPrice')?.value)||100000;
      const bio   = document.getElementById('regBio')?.value.trim();
      if(!loc){ err.textContent='Isi kota domisili.'; return; }
      userData.np = {
        specialty: spec, education: edu, exp: 0, price,
        rating: 0, reviews: 0, loc, avail: true, verified: false,
        bio: bio||'Perawat baru bergabung di Akemat Foundation.',
        schedule:['Senin','Selasa','Rabu','Kamis','Jumat'],
        services: (BOOKING_SERVICES[spec]||[spec]),
      };
    }

    const regBtn = document.getElementById('btnRegister');
    regBtn.disabled = true;
    try {
      await Store.register(userData, otpProof);
      toast('Akun berhasil dibuat! Selamat bergabung, '+name.split(' ')[0]+'.','s');
      navigate('#dashboard');
    } catch(e) {
      err.textContent = e.message || 'Gagal membuat akun.';
      regBtn.disabled = false;
    }
  });
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
  if(viewerRole === 'patient'){
    if(b.paymentStatus !== 'paid') return payBtnHTML(b.status, id);
    if(b.status === 'completed'){
      if(b.reviewed) return '<span style="color:var(--success);font-size:.8rem">✓ Sudah dinilai</span>';
      return '<button class="btn btn-xs btn-accent" onclick="openRateModal(\''+id+'\',\''+esc(b.nurseName||'')+'\')">⭐ Beri Rating</button>';
    }
    return '<span style="color:#9CA3AF">—</span>';
  }
  if(b.paymentStatus !== 'paid'){
    return '<span style="font-size:.72rem;color:var(--soft)">⏳ Menunggu pembayaran pasien</span>';
  }
  if(b.status==='pending'){
    return '<button class="btn btn-xs btn-primary" onclick="updateBooking(\'' + id + '\',\'confirmed\')">Terima</button>' +
           ' <button class="btn btn-xs btn-danger" onclick="updateBooking(\'' + id + '\',\'cancelled\')">Tolak</button>';
  }
  if(b.status==='confirmed'){
    return '<button class="btn btn-xs btn-outline" onclick="updateBooking(\'' + id + '\',\'completed\')">Selesai</button>';
  }
  return '—';
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
  if(!confirm('Ajukan pencairan '+rpFmt(available)+' ke '+bank.bankName+' '+bank.accountNumber+'?')) return;
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
    '<div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="npPrice" value="'+(np.price||0)+'" /></div>'+
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
    '<label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;font-size:.78rem;color:var(--soft);cursor:pointer">'+
    '<input type="checkbox" id="bankConsent" style="margin-top:2px" />'+
    '<span>Saya menyetujui data rekening ini digunakan untuk pencairan dana sesuai <a href="#privasi" target="_blank">Kebijakan Privasi</a>.</span></label>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveBank">Simpan Data Rekening</button></div>';
}

// ── Admin: review manual KTP & campaign (akses dibatasi server-side
// lewat ADMIN_EMAILS di api/admin.js, bukan lewat role di tabel users —
// lihat catatan keamanan di file itu) ─────────────────────────
// Setiap akses Panel Admin wajib 2FA OTP WA (lihat komentar di api/admin.js)
// selain email+password — akun admin bisa lihat semua KTP & data rekening,
// jadi pantas dapat lapisan verifikasi tambahan.
function renderAdminOtpGate(u){
  if(!u.phone){
    app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
      '<div style="font-size:2.5rem;margin-bottom:10px">🔒</div>'+
      '<h2>Nomor HP belum diisi</h2>'+
      '<p style="color:var(--soft);margin:8px 0 20px">Verifikasi 2FA Panel Admin butuh nomor HP terdaftar. Isi dulu di halaman Profil.</p>'+
      '<a href="#profil" class="btn btn-primary">Ke Halaman Profil</a></div>';
    return;
  }
  app.innerHTML = '<div class="container" style="padding:60px 20px;max-width:420px;margin:0 auto">'+
    '<div style="text-align:center;margin-bottom:20px"><div style="font-size:2.5rem">🔐</div>'+
    '<h2>Verifikasi 2FA</h2>'+
    '<p style="color:var(--soft);font-size:.88rem">Panel Admin butuh verifikasi tambahan via WhatsApp ke nomor terdaftar Anda ('+esc(u.phone.replace(/^62/,'0'))+').</p></div>'+
    '<div id="aoStep1"><button class="btn btn-primary btn-full" id="btnAoSend">Kirim Kode OTP WA</button></div>'+
    '<div id="aoStep2" style="display:none;margin-top:14px">'+
    '<div class="ff"><label>Kode OTP WhatsApp</label><input type="text" id="aoCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="letter-spacing:.3em" /></div>'+
    '<button class="btn btn-primary btn-full" id="btnAoVerify">Verifikasi &amp; Masuk</button></div>'+
    '<div class="form-error" id="aoErr"></div>'+
    '</div>';

  let requestId = null;
  document.getElementById('btnAoSend')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const err = document.getElementById('aoErr'); err.textContent = '';
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      requestId = await Otp.send(u.phone);
      document.getElementById('aoStep1').style.display = 'none';
      document.getElementById('aoStep2').style.display = 'block';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e) {
      err.textContent = e.message || 'Gagal mengirim OTP.';
      btn.disabled = false; btn.textContent = orig;
    }
  });
  document.getElementById('btnAoVerify')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const err = document.getElementById('aoErr'); err.textContent = '';
    const code = document.getElementById('aoCode')?.value.trim();
    if(!code){ err.textContent = 'Isi kode OTP.'; return; }
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memverifikasi…';
    try {
      adminOtpProof = await Otp.verify(requestId, code, u.phone);
      renderAdminDash();
    } catch(e) {
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
      btn.disabled = false; btn.textContent = orig;
    }
  });
}

async function renderAdminDash(){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
  if(!adminOtpProof){ renderAdminOtpGate(u); return; }
  app.innerHTML = '<div class="app-loading"><div class="app-loading-spinner"></div><p>Memuat data admin…</p></div>';

  async function adminApi(payload){
    try {
      return await apiFetch('admin', { ...payload, adminOtpProof });
    } catch(e) {
      if(e.code === 'OTP_REQUIRED'){ adminOtpProof = null; toast('Sesi verifikasi 2FA berakhir, silakan verifikasi ulang.','e'); }
      throw e;
    }
  }

  let ktps = [], patKtps = [], camps = [], promos = [], auditLog = [];
  try {
    const [rk, rpk, rc, rp, ra] = await Promise.all([
      adminApi({ action:'listPendingKtp' }),
      adminApi({ action:'listPendingPatientKtp' }),
      adminApi({ action:'listPendingCampaigns' }),
      adminApi({ action:'listPromoCodes' }),
      adminApi({ action:'listAuditLog' }),
    ]);
    ktps     = rk.data  || [];
    patKtps = rpk.data || [];
    camps    = rc.data  || [];
    promos   = rp.data  || [];
    auditLog = ra.data  || [];
  } catch(e) {
    if(!adminOtpProof){ renderAdminOtpGate(u); return; }
    app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
      '<div style="font-size:2.5rem;margin-bottom:10px">🔒</div>'+
      '<h2>Akses Ditolak</h2>'+
      '<p style="color:var(--soft);margin:8px 0 20px">'+esc(e.message||'Akun ini tidak punya akses admin.')+'</p>'+
      '<a href="#" class="btn btn-primary">Kembali ke Beranda</a></div>';
    return;
  }

  function ktpCard(k){
    return '<div class="dash-section" id="ktp-row-'+k.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
      (k.ktp_url?'<img src="'+k.ktp_url+'" alt="Foto KTP" style="width:160px;border-radius:var(--r-sm);border:1px solid var(--border)" loading="lazy" />':'<div style="width:160px;height:100px;background:var(--bg-alt);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;color:var(--soft);font-size:.76rem">Tidak ada foto</div>')+
      '<div style="flex:1;min-width:180px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(k.name)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">'+esc(k.email)+' · '+esc(k.phone||'—')+'</div>'+
      '<div style="font-size:.74rem;color:var(--soft);margin-top:4px">Diunggah: '+esc((k.created_at||'').slice(0,10))+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-ktp="'+k.id+'">✓ Setujui</button>'+
      '<button class="btn btn-outline btn-sm" data-reject-ktp="'+k.id+'">✕ Tolak</button>'+
      '</div></div></div></div>';
  }
  function patKtpCard(k){
    return '<div class="dash-section" id="pkt-row-'+k.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
      (k.ktp_url?'<img src="'+k.ktp_url+'" alt="Foto KTP" style="width:160px;border-radius:var(--r-sm);border:1px solid var(--border)" loading="lazy" />':'<div style="width:160px;height:100px;background:var(--bg-alt);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;color:var(--soft);font-size:.76rem">Tidak ada foto</div>')+
      '<div style="flex:1;min-width:180px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(k.name)+' <span style="font-weight:400;color:var(--soft);font-size:.8rem">('+esc(k.relationship)+')</span></div>'+
      '<div style="font-size:.74rem;color:var(--soft);margin-top:4px">Diunggah: '+esc((k.created_at||'').slice(0,10))+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-pkt="'+k.id+'">✓ Setujui</button>'+
      '<button class="btn btn-outline btn-sm" data-reject-pkt="'+k.id+'">✕ Tolak</button>'+
      '</div></div></div></div>';
  }
  function campCard(c){
    return '<div class="dash-section" id="camp-row-'+c.id+'" style="margin-bottom:12px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(c.title)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">oleh '+esc(c.creator_name)+' · target '+rpFmt(c.target)+'</div>'+
      '<div style="font-size:.8rem;margin-top:6px">🏦 '+esc(c.bank_name||'—')+' — '+esc(c.bank_account_number||'—')+' a.n. '+esc(c.bank_account_name||'—')+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-camp="'+c.id+'">✓ Setujui</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-camp="'+c.id+'">🗑 Hapus</button>'+
      '</div></div>';
  }

  function promoRow(pc){
    var discTxt = pc.discount_type==='percent' ? pc.discount_value+'%' : rpFmt(pc.discount_value);
    var usageTxt = pc.max_uses!=null ? (pc.used_count||0)+' / '+pc.max_uses+' dipakai' : (pc.used_count||0)+' dipakai (tanpa batas)';
    var statusCls = pc.active ? 'verified' : 'empty';
    var statusLbl = pc.active ? '✓ Aktif' : '✕ Nonaktif';
    return '<div class="dash-section" id="promo-row-'+pc.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">'+
      '<div><div style="font-family:var(--font-d);font-weight:700">'+esc(pc.code)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">Potongan '+discTxt+(pc.min_amount?' · min. '+rpFmt(pc.min_amount):'')+' · berlaku untuk '+esc(pc.applies_to)+'</div>'+
      '<div style="font-size:.76rem;color:var(--soft);margin-top:2px">'+usageTxt+'</div></div>'+
      '<span class="bank-status '+statusCls+'">'+statusLbl+'</span>'+
      '</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-outline btn-sm" data-toggle-promo="'+pc.id+'" data-active="'+(!pc.active)+'">'+(pc.active?'Nonaktifkan':'Aktifkan')+'</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-promo="'+pc.id+'">🗑 Hapus</button>'+
      '</div></div>';
  }

  app.innerHTML = '<div class="container" style="padding:32px 20px">'+
    '<div style="max-width:760px">'+
    '<h2 style="margin-bottom:4px">Panel Admin</h2>'+
    '<p style="color:var(--soft);font-size:.86rem;margin-bottom:24px">Review manual — dipakai sampai verifikasi otomatis dibangun (kalau nanti diputuskan).</p>'+
    '<h3 id="ktpHeading" style="margin-bottom:10px">🪪 KTP Akun Menunggu Verifikasi ('+ktps.length+')</h3>'+
    '<div id="ktpList">'+(ktps.length ? ktps.map(ktpCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 id="pktHeading" style="margin:24px 0 10px">🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi ('+patKtps.length+')</h3>'+
    '<div id="pktList">'+(patKtps.length ? patKtps.map(patKtpCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 id="campHeading" style="margin:24px 0 10px">💰 Campaign Menunggu Verifikasi ('+camps.length+')</h3>'+
    '<div id="campList">'+(camps.length ? camps.map(campCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 style="margin:24px 0 10px">🎟️ Kode Promo</h3>'+
    '<div class="dash-section" style="margin-bottom:12px">'+
    '<div class="profile-grid">'+
    '<div class="ff"><label>Kode</label><input type="text" id="pcCode" placeholder="mis. HEMAT10" style="text-transform:uppercase" /></div>'+
    '<div class="ff"><label>Jenis diskon</label><select id="pcType"><option value="percent">Persen (%)</option><option value="fixed">Potongan tetap (Rp)</option></select></div>'+
    '<div class="ff"><label>Nilai diskon</label><input type="number" id="pcValue" placeholder="mis. 10 atau 50000" /></div>'+
    '<div class="ff"><label>Maks. potongan (Rp, opsional)</label><input type="number" id="pcMaxDiscount" placeholder="Kosongkan = tanpa batas" /></div>'+
    '<div class="ff"><label>Minimal transaksi (Rp)</label><input type="number" id="pcMinAmount" placeholder="0" /></div>'+
    '<div class="ff"><label>Maks. pemakaian (opsional)</label><input type="number" id="pcMaxUses" placeholder="Kosongkan = tanpa batas" /></div>'+
    '</div>'+
    '<button class="btn btn-accent btn-sm" id="btnCreatePromo" style="margin-top:6px">+ Buat Kode Promo</button>'+
    '</div>'+
    '<div id="promoList">'+(promos.length ? promos.map(promoRow).join('') : '<p style="color:var(--soft);font-size:.84rem">Belum ada kode promo.</p>')+'</div>'+
    '<h3 style="margin:24px 0 10px">📋 Log Audit (50 terakhir)</h3>'+
    '<div class="dash-section" style="max-height:320px;overflow-y:auto">'+
    (auditLog.length ? '<table style="width:100%;font-size:.78rem;border-collapse:collapse">'+
      auditLog.map(function(l){
        return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 4px;color:var(--soft);white-space:nowrap">'+esc((l.created_at||'').replace('T',' ').slice(0,16))+'</td>'+
          '<td style="padding:6px 4px">'+esc(l.admin_email)+'</td>'+
          '<td style="padding:6px 4px;font-weight:600">'+esc(l.action)+'</td>'+
          '<td style="padding:6px 4px;color:var(--soft)">'+esc(l.target_table||'')+(l.target_id?' #'+esc(String(l.target_id).slice(0,8)):'')+'</td></tr>';
      }).join('') + '</table>'
      : '<p style="color:var(--soft);font-size:.84rem;margin:0">Belum ada aktivitas tercatat.</p>')+
    '</div>'+
    '</div></div>';

  // Hapus satu kartu dari layar dengan fade halus + update angka counter di
  // heading-nya, TANPA fetch ulang seluruh Panel Admin — supaya klik
  // approve/reject/hapus berulang kali kerasa instan, bukan kedip
  // "Memuat…" tiap kali (log audit di bawah baru ter-update saat halaman
  // dibuka ulang — trade-off yang wajar untuk responsivitas).
  function removeRowSmooth(rowId, listId, headingId, label){
    const card = document.getElementById(rowId);
    const list = document.getElementById(listId);
    if(!card) return;
    card.style.transition = 'opacity .22s ease, transform .22s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(.97)';
    setTimeout(()=>{
      card.remove();
      const remaining = list ? list.children.length : 0;
      const heading = document.getElementById(headingId);
      if(heading) heading.textContent = label+' ('+remaining+')';
      if(list && remaining === 0) list.innerHTML = '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>';
    }, 220);
  }

  const ROW_CONFIG = {
    approveKtp:        { row:'ktp-row-',  list:'ktpList',  heading:'ktpHeading',  label:'🪪 KTP Akun Menunggu Verifikasi' },
    rejectKtp:         { row:'ktp-row-',  list:'ktpList',  heading:'ktpHeading',  label:'🪪 KTP Akun Menunggu Verifikasi' },
    approvePatientKtp: { row:'pkt-row-',  list:'pktList',  heading:'pktHeading',  label:'🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi' },
    rejectPatientKtp:  { row:'pkt-row-',  list:'pktList',  heading:'pktHeading',  label:'🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi' },
    approveCampaign:   { row:'camp-row-', list:'campList', heading:'campHeading', label:'💰 Campaign Menunggu Verifikasi' },
    deleteCampaign:    { row:'camp-row-', list:'campList', heading:'campHeading', label:'💰 Campaign Menunggu Verifikasi' },
  };
  async function runAction(action, id, okMsg){
    try {
      await adminApi({ action, id });
      toast(okMsg,'s');
      const cfg = ROW_CONFIG[action];
      if(cfg) removeRowSmooth(cfg.row+id, cfg.list, cfg.heading, cfg.label);
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }
  document.querySelectorAll('[data-approve-ktp]').forEach(b=>b.addEventListener('click',()=>runAction('approveKtp', b.dataset.approveKtp, 'KTP disetujui.')));
  document.querySelectorAll('[data-reject-ktp]').forEach(b=>b.addEventListener('click',()=>{ if(confirm('Tolak KTP ini? Status kembali ke belum diunggah.')) runAction('rejectKtp', b.dataset.rejectKtp, 'KTP ditolak.'); }));
  document.querySelectorAll('[data-approve-pkt]').forEach(b=>b.addEventListener('click',()=>runAction('approvePatientKtp', b.dataset.approvePkt, 'KTP pasien disetujui.')));
  document.querySelectorAll('[data-reject-pkt]').forEach(b=>b.addEventListener('click',()=>{ if(confirm('Tolak KTP pasien ini? Status kembali ke belum diunggah.')) runAction('rejectPatientKtp', b.dataset.rejectPkt, 'KTP pasien ditolak.'); }));
  document.querySelectorAll('[data-approve-camp]').forEach(b=>b.addEventListener('click',()=>runAction('approveCampaign', b.dataset.approveCamp, 'Campaign disetujui.')));
  document.querySelectorAll('[data-delete-camp]').forEach(b=>b.addEventListener('click',()=>{ if(confirm('Hapus campaign ini? Tidak bisa dibatalkan.')) runAction('deleteCampaign', b.dataset.deleteCamp, 'Campaign dihapus.'); }));

  document.querySelectorAll('[data-toggle-promo]').forEach(b=>b.addEventListener('click', async ()=>{
    const id = b.dataset.togglePromo;
    const newActive = b.dataset.active === 'true';
    try {
      await adminApi({ action:'togglePromoCode', id, data:{ active: newActive } });
      toast('Status kode promo diperbarui.','s');
      const row = document.getElementById('promo-row-'+id);
      const badge = row?.querySelector('.bank-status');
      if(badge){ badge.className = 'bank-status '+(newActive?'verified':'empty'); badge.textContent = newActive?'✓ Aktif':'✕ Nonaktif'; }
      b.textContent = newActive ? 'Nonaktifkan' : 'Aktifkan';
      b.dataset.active = String(!newActive);
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }));
  document.querySelectorAll('[data-delete-promo]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm('Hapus kode promo ini? Tidak bisa dibatalkan.')) return;
    const id = b.dataset.deletePromo;
    try {
      await adminApi({ action:'deletePromoCode', id });
      toast('Kode promo dihapus.','s');
      const row = document.getElementById('promo-row-'+id);
      if(row){
        row.style.transition = 'opacity .22s ease, transform .22s ease';
        row.style.opacity = '0'; row.style.transform = 'scale(.97)';
        setTimeout(()=>{
          row.remove();
          const list = document.getElementById('promoList');
          if(list && !list.children.length) list.innerHTML = '<p style="color:var(--soft);font-size:.84rem">Belum ada kode promo.</p>';
        }, 220);
      }
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }));
  document.getElementById('btnCreatePromo')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const code = document.getElementById('pcCode')?.value.trim();
    const discountType = document.getElementById('pcType')?.value;
    const discountValue = document.getElementById('pcValue')?.value;
    const maxDiscount = document.getElementById('pcMaxDiscount')?.value;
    const minAmount = document.getElementById('pcMinAmount')?.value;
    const maxUses = document.getElementById('pcMaxUses')?.value;
    if(!code || !discountValue){ toast('Isi kode dan nilai diskon.','e'); return; }
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Membuat…';
    try {
      await adminApi({ action:'createPromoCode', data:{ code, discountType, discountValue, maxDiscount, minAmount, maxUses, active:true, appliesTo:'booking' } });
      toast('Kode promo dibuat.','s');
      renderAdminDash();
    } catch(e) {
      toast('Gagal: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = orig;
    }
  });
}

// ── Profil Pasien (multi-pasien per akun, tiap profil punya KTP sendiri) ──
function patientProfilesSection(profiles){
  function card(p){
    var cls = p.ktpStatus==='verified' ? 'verified' : p.ktpStatus==='uploaded' ? 'pending' : 'empty';
    var lbl = p.ktpStatus==='verified' ? '✓ Terverifikasi' : p.ktpStatus==='uploaded' ? '⏳ Menunggu verifikasi' : p.ktpStatus==='rejected' ? '✕ Ditolak — unggah ulang' : '❌ KTP belum diunggah';
    return '<div class="dash-section" id="pp-card-'+p.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">'+
      '<div><div style="font-family:var(--font-d);font-weight:700">'+esc(p.name)+'</div>'+
      '<div style="font-size:.78rem;color:var(--soft)">'+esc(p.relationship)+'</div></div>'+
      '<span class="bank-status '+cls+'">'+lbl+'</span>'+
      '</div>'+
      (p.ktpUrl?'<img src="'+p.ktpUrl+'" alt="Foto KTP '+esc(p.name)+'" style="max-width:160px;border-radius:var(--r-sm);border:1px solid var(--border);margin-top:10px;display:block" loading="lazy" />':'')+
      '<label style="display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:.76rem;color:var(--soft);cursor:pointer">'+
      '<input type="checkbox" class="pp-ktp-consent" data-consent-for="'+p.id+'" style="margin-top:2px" />'+
      '<span>Saya menyetujui foto KTP ini digunakan untuk verifikasi identitas sesuai <a href="#privasi" target="_blank">Kebijakan Privasi</a>.</span></label>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">'+
      '<label class="btn btn-outline btn-sm" style="cursor:pointer">📎 '+(p.ktpUrl?'Ganti KTP':'Upload KTP')+'<input type="file" accept="image/jpeg,image/png" style="display:none" data-ktp-for="'+p.id+'" /></label>'+
      '<button class="btn btn-outline btn-sm" data-edit-pp="'+p.id+'">Edit</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-pp="'+p.id+'">Hapus</button>'+
      '</div></div>';
  }
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>🧑‍🤝‍🧑 Profil Pasien</h3><button class="btn btn-accent btn-sm" id="btnAddPatientProfile">+ Tambah Pasien</button></div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:0">Data orang yang akan dirawat saat buat janji temu — bisa lebih dari satu (mis. anggota keluarga). Wajib ada minimal 1 profil dengan KTP terunggah sebelum bisa membuat janji temu.</p>'+
    (profiles.length ? '' : '<p style="font-size:.84rem;color:var(--soft);margin-top:12px">Belum ada profil pasien. Tambahkan dulu sebelum membuat janji temu.</p>')+
    '</div>'+
    profiles.map(card).join('');
}

function ktpSection(u){
  var status = u.ktpStatus || 'pending';
  var cls    = status==='verified' ? 'verified' : status==='uploaded' ? 'pending' : 'empty';
  var lbl    = status==='verified' ? '✓ Terverifikasi' : status==='uploaded' ? '⏳ Menunggu verifikasi' : status==='rejected' ? '✕ Ditolak — unggah ulang' : '❌ Belum diunggah';
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>📎 Verifikasi Identitas (KTP)</h3><span class="bank-status '+cls+'">'+lbl+'</span></div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Wajib diunggah sebelum janji temu/campaign pertama Anda. Foto KTP (JPG/PNG), maks. 5MB — pastikan foto, NIK, dan alamat terbaca jelas.</p>'+
    (u.ktpUrl?'<img src="'+u.ktpUrl+'" alt="Foto KTP tersimpan" style="max-width:220px;border-radius:var(--r-sm);border:1px solid var(--border);display:block;margin-bottom:10px" loading="lazy" />':'')+
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border:1.5px dashed var(--border);border-radius:var(--r-sm);background:var(--bg-alt)">'+
    '<span style="font-size:1.4rem">🪪</span>'+
    '<div><div style="font-family:var(--font-d);font-weight:600;font-size:.84rem;color:var(--primary)" id="ktpFilename">'+(u.ktpUrl?'KTP tersimpan — klik untuk ganti':'Pilih foto KTP')+'</div>'+
    '<div style="font-size:.74rem;color:var(--soft)">Klik untuk upload</div></div>'+
    '<input type="file" id="profKtp" accept="image/jpeg,image/png" style="display:none" onchange="document.getElementById(\'ktpFilename\').textContent=this.files[0]?.name||\'Pilih foto KTP\'" />'+
    '</label>'+
    '<label style="display:flex;align-items:flex-start;gap:8px;margin-top:12px;font-size:.78rem;color:var(--soft);cursor:pointer">'+
    '<input type="checkbox" id="ktpConsent" style="margin-top:2px" />'+
    '<span>Saya menyetujui foto KTP ini digunakan untuk verifikasi identitas sesuai <a href="#privasi" target="_blank">Kebijakan Privasi</a>.</span></label>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveKtp" style="margin-top:10px">Simpan KTP</button></div>';
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

// ── Profile ─────────────────────────────────────────────────
// ── TNC ────────────────────────────────────────────────────
function renderTNC(){
  var html = '<div class="tnc-faq-page">';
  html += '<p class="eyebrow">Dokumen legal</p>';
  html += '<h1>Syarat &amp; Ketentuan</h1>';
  html += '<p class="lead">Terakhir diperbarui: 1 Juli 2025. Dengan menggunakan platform Akemat Foundation, Anda menyetujui seluruh ketentuan di bawah ini.</p>';
  html += '<div class="tnc-section"><h2>1. Tentang Platform</h2>';
  html += '<p>Akemat Foundation adalah platform digital berbasis yayasan yang mempertemukan pasien/keluarga yang membutuhkan layanan perawatan di rumah (<em>home care</em>) dengan tenaga perawat profesional terlatih. Platform ini juga menyediakan fitur kampanye donasi untuk membantu pembiayaan layanan perawatan bagi mereka yang membutuhkan.</p></div>';
  html += '<div class="tnc-section"><h2>2. Akun Pengguna</h2>';
  html += '<h3>2.1 Pendaftaran</h3><ul><li>Pengguna wajib mendaftar dengan identitas asli dan data yang benar.</li><li>Setiap pengguna hanya diperbolehkan memiliki satu akun aktif.</li><li>Akemat Foundation berhak menonaktifkan akun yang terindikasi melanggar ketentuan.</li></ul>';
  html += '<h3>2.2 Keamanan Akun</h3><ul><li>Pengguna bertanggung jawab penuh atas kerahasiaan kata sandi dan keamanan akun.</li><li>Segera laporkan ke kami jika terdapat akses tidak sah ke akun Anda.</li></ul></div>';
  html += '<div class="tnc-section"><h2>3. Layanan Perawat (Home Care)</h2>';
  html += '<h3>3.1 Janji Temu &amp; Pembayaran</h3><ul><li>Pasien membuat janji temu dengan perawat melalui platform dan melakukan pembayaran sesuai tarif yang tertera.</li><li><strong>Struktur biaya janji temu:</strong> 80% diterima perawat; 20% adalah biaya platform Akemat Foundation.</li><li>Biaya platform digunakan untuk operasional, verifikasi perawat, pengembangan aplikasi, dan layanan pelanggan.</li><li>Tarif per jam ditetapkan oleh perawat dan ditampilkan secara transparan di profil masing-masing.</li></ul>';
  html += '<h3>3.2 Verifikasi Perawat</h3><ul><li>Perawat yang bergabung wajib menyerahkan dokumen identitas, ijazah keperawatan, dan STR untuk proses verifikasi.</li><li>Perawat yang belum terverifikasi ditandai secara jelas di platform.</li></ul>';
  html += '<h3>3.3 Pembatalan &amp; Refund</h3><ul><li>Pembatalan oleh pasien minimal 24 jam sebelum jadwal: refund 100%.</li><li>Pembatalan kurang dari 24 jam: dikenakan biaya admin 10%.</li><li>Pembatalan sepihak oleh perawat tanpa alasan valid: refund 100% ke pasien.</li><li>Proses refund dilakukan dalam 3–5 hari kerja.</li></ul>';
  html += '<h3>3.4 Rekening Perawat</h3><ul><li>Perawat wajib mengisi data rekening bank yang valid untuk pencairan penghasilan.</li><li>Pencairan dilakukan setiap minggu untuk janji temu yang berstatus selesai.</li><li>Verifikasi rekening dilakukan oleh tim Akemat dalam 1×24 jam kerja.</li></ul></div>';
  html += '<div class="tnc-section"><h2>4. Kampanye Donasi</h2>';
  html += '<h3>4.1 Pembuatan Campaign</h3><ul><li>Penggalang Dana yang terverifikasi dapat membuat kampanye donasi untuk membantu pembiayaan layanan perawatan.</li><li>Akemat Foundation berhak menolak atau menghapus kampanye yang tidak sesuai ketentuan.</li></ul>';
  html += '<h3>4.2 Biaya Layanan Donasi</h3><ul><li><strong>Dari setiap donasi: 95% disalurkan ke kampanye; 5% adalah biaya layanan platform.</strong></li><li>Biaya layanan mencakup verifikasi kampanye, operasional sistem pembayaran, dan akuntabilitas donasi.</li></ul>';
  html += '<h3>4.3 Rekening Penerima Campaign</h3><ul><li>Pemilik kampanye wajib mendaftarkan rekening bank yang valid sebagai tujuan pencairan donasi.</li><li>Pencairan dilakukan setelah kampanye berakhir atau mencapai target, setelah proses verifikasi.</li></ul>';
  html += '<h3>4.4 Tanggung Jawab Penggalang Dana</h3><ul><li>Donasi yang sudah dikirim tidak dapat ditarik kembali kecuali kampanye dibatalkan oleh Akemat Foundation.</li></ul></div>';
  html += '<div class="tnc-section"><h2>5. Privasi Data</h2>';
  html += '<ul><li>Data pribadi pengguna hanya digunakan untuk keperluan layanan platform.</li><li>Akemat Foundation tidak menjual atau membagikan data pengguna kepada pihak ketiga untuk tujuan komersial.</li><li>Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan yang berwenang.</li></ul></div>';
  html += '<div class="tnc-section"><h2>6. Larangan Penggunaan</h2>';
  html += '<p>Pengguna dilarang keras untuk:</p><ul><li>Membuat kampanye donasi palsu atau menyesatkan.</li><li>Mendaftarkan identitas atau data rekening palsu.</li><li>Menggunakan platform untuk tujuan yang melanggar hukum Indonesia.</li><li>Meminta pembayaran di luar platform kepada perawat atau pasien.</li></ul></div>';
  html += '<div class="tnc-section"><h2>7. Perubahan Ketentuan</h2>';
  html += '<p>Akemat Foundation berhak mengubah Syarat &amp; Ketentuan ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui email terdaftar minimal 7 hari sebelum berlaku.</p></div>';
  html += '<div class="tnc-section"><h2>8. Kontak &amp; Penyelesaian Sengketa</h2>';
  html += '<ul><li>Email: customercare@akematfoundation.org</li><li>WhatsApp: +62 851-9640-7117</li><li>Jam layanan: Senin–Sabtu, 08.00–17.00 WIB</li></ul></div>';
  html += '<div style="margin-top:36px;text-align:center"><a href="#" class="btn btn-primary">Kembali ke Beranda</a> <a href="#faq" class="btn btn-outline" style="margin-left:10px">Lihat FAQ →</a></div>';
  html += '</div>';
  app.innerHTML = html + renderFooterSection();
}

// ── Kebijakan Privasi ──────────────────────────────────────
function renderPrivacyPolicy(){
  var html = '<div class="tnc-faq-page">';
  html += '<p class="eyebrow">Dokumen legal</p>';
  html += '<h1>Kebijakan Privasi</h1>';
  html += '<p class="lead">Terakhir diperbarui: 17 Juli 2026. Kebijakan ini menjelaskan data apa saja yang kami kumpulkan, untuk apa, dan bagaimana kami melindunginya.</p>';

  html += '<div class="tnc-section"><h2>1. Data yang Kami Kumpulkan</h2>';
  html += '<ul><li><strong>Data akun:</strong> nama, email, nomor HP, tanggal lahir, jenis kelamin, alamat.</li>'
    + '<li><strong>Data identitas:</strong> foto KTP — dipakai untuk verifikasi identitas pasien, perawat, dan penggalang dana sebelum bisa membuat janji temu atau kampanye donasi.</li>'
    + '<li><strong>Data keuangan:</strong> nama bank, nomor rekening, dan nama pemilik rekening — dipakai untuk pencairan penghasilan perawat dan dana kampanye.</li>'
    + '<li><strong>Data transaksi:</strong> riwayat janji temu, donasi, dan status pembayaran.</li>'
    + '<li><strong>Data teknis:</strong> data sesi login untuk menjaga akun Anda tetap aman, dan data analitik kunjungan (halaman yang dibuka) untuk memahami penggunaan platform secara agregat — tidak dipakai untuk mengidentifikasi Anda secara pribadi.</li></ul></div>';

  html += '<div class="tnc-section"><h2>2. Untuk Apa Data Digunakan</h2>';
  html += '<ul><li>Memverifikasi identitas pengguna (KTP) supaya platform aman dari akun/kampanye palsu.</li>'
    + '<li>Memproses pembayaran janji temu dan donasi lewat mitra payment gateway resmi.</li>'
    + '<li>Mencairkan penghasilan perawat dan dana kampanye ke rekening yang terdaftar.</li>'
    + '<li>Menghubungi Anda terkait janji temu, donasi, atau masalah akun (email/WhatsApp).</li>'
    + '<li>Mencegah penyalahgunaan platform (mis. kampanye donasi palsu, pemalsuan identitas).</li></ul></div>';

  html += '<div class="tnc-section"><h2>3. Siapa yang Bisa Mengakses Data Anda</h2>';
  html += '<ul><li>Foto KTP dan data rekening bank <strong>tidak pernah ditampilkan ke publik</strong> — hanya bisa diakses oleh pemilik akun sendiri dan tim internal Akemat Foundation yang berwenang untuk keperluan verifikasi.</li>'
    + '<li>Data pembayaran diproses lewat mitra payment gateway resmi (DOKU) sesuai kebutuhan transaksi — kami tidak pernah membagikan data Anda ke pihak lain untuk tujuan pemasaran.</li>'
    + '<li>Akemat Foundation <strong>tidak menjual</strong> data pribadi pengguna kepada siapa pun.</li></ul></div>';

  html += '<div class="tnc-section"><h2>4. Keamanan Data</h2>';
  html += '<ul><li>Akses ke data sensitif (KTP, rekening, status pembayaran) dibatasi lewat sistem otentikasi berbasis sesi login — setiap permintaan data diverifikasi di server sebelum diproses.</li>'
    + '<li>Status pembayaran "lunas" hanya bisa berubah lewat verifikasi langsung ke payment gateway, tidak bisa dimanipulasi dari sisi pengguna.</li>'
    + '<li>Kata sandi akun disimpan terenkripsi dan tidak pernah bisa dibaca oleh siapa pun, termasuk tim kami.</li></ul></div>';

  html += '<div class="tnc-section"><h2>5. Hak Anda atas Data Pribadi</h2>';
  html += '<p>Sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi, Anda berhak untuk:</p>';
  html += '<ul><li>Melihat dan memperbarui data pribadi Anda kapan saja lewat halaman Profil.</li>'
    + '<li>Meminta penghapusan akun dan data pribadi Anda (kecuali data yang wajib disimpan untuk kepatuhan hukum/keuangan, mis. riwayat transaksi).</li>'
    + '<li>Meminta salinan data pribadi yang kami simpan tentang Anda.</li>'
    + '<li>Mengajukan keberatan atas penggunaan data Anda untuk tujuan tertentu.</li></ul>';
  html += '<p>Untuk mengajukan permintaan di atas, hubungi kami lewat kontak di bagian bawah halaman ini.</p></div>';

  html += '<div class="tnc-section"><h2>6. Penyimpanan Data</h2>';
  html += '<p>Data disimpan selama akun Anda aktif. Kalau Anda meminta penghapusan akun, data pribadi akan dihapus dalam waktu wajar kecuali ada kewajiban hukum untuk menyimpannya lebih lama (mis. catatan transaksi keuangan). Foto KTP yang statusnya ditolak (tidak lolos verifikasi) otomatis dihapus dari server setelah 30 hari.</p></div>';

  html += '<div class="tnc-section"><h2>7. Perubahan Kebijakan</h2>';
  html += '<p>Kebijakan ini bisa diperbarui sewaktu-waktu mengikuti perkembangan layanan atau regulasi. Perubahan signifikan akan diberitahukan lewat email terdaftar.</p></div>';

  html += '<div class="tnc-section"><h2>8. Kontak</h2>';
  html += '<ul><li>Email: customercare@akematfoundation.org</li><li>WhatsApp: +62 851-9640-7117</li></ul></div>';

  html += '<div style="margin-top:36px;text-align:center"><a href="#" class="btn btn-primary">Kembali ke Beranda</a> <a href="#tnc" class="btn btn-outline" style="margin-left:10px">Syarat &amp; Ketentuan →</a></div>';
  html += '</div>';
  app.innerHTML = html + renderFooterSection();
}

// ── FAQ ────────────────────────────────────────────────────
function renderFAQ(){
  const faqs = [
    { q:'Apa itu Akemat Foundation?', a:'Akemat Foundation adalah yayasan kemanusiaan yang mempertemukan pasien/keluarga dengan perawat profesional untuk layanan home care (perawatan di rumah). Kami juga menyediakan platform donasi untuk membantu pembiayaan perawatan bagi yang membutuhkan.' },
    { q:'Bagaimana cara membuat janji temu dengan perawat?', cat:'Janji Temu Perawat', a:'(1) Daftar atau login sebagai pasien. (2) Klik Cari Perawat dan filter berdasarkan spesialisasi, kota, dan ketersediaan. (3) Pilih perawat dan klik Buat Janji. (4) Isi detail tanggal, waktu, durasi, dan alamat. (5) Konfirmasi janji temu — perawat akan menghubungi Anda via WhatsApp.' },
    { q:'Berapa biaya platform untuk janji temu perawat?', cat:'Janji Temu Perawat', a:'Platform Akemat mengambil 20% dari total nilai janji temu. Artinya, jika Anda membayar Rp 300.000, perawat menerima Rp 240.000 (80%) dan Rp 60.000 (20%) masuk ke operasional platform. Rincian ini selalu ditampilkan transparan sebelum Anda konfirmasi janji temu.', highlight:'Pasien bayar: 100% → Perawat terima: 80% → Platform: 20%' },
    { q:'Berapa biaya layanan untuk donasi?', cat:'Donasi', a:'Dari setiap donasi yang masuk, 95% langsung disalurkan ke campaign dan 5% adalah biaya layanan platform. Biaya ini mencakup verifikasi campaign, sistem pembayaran, dan operasional.', highlight:'Donasi Anda: 100% → Campaign terima: 95% → Platform: 5%' },
    { q:'Apakah perawat di Akemat sudah terverifikasi?', cat:'Janji Temu Perawat', a:'Perawat dengan lencana Terverifikasi telah melalui proses verifikasi dokumen identitas, ijazah keperawatan, dan STR (Surat Tanda Registrasi). Perawat yang belum terverifikasi diberi label jelas.' },
    { q:'Apa saja spesialisasi perawat yang tersedia?', cat:'Janji Temu Perawat', a:'Akemat memiliki 7 spesialisasi: Perawat Jiwa, Perawat Anak & Bayi, Perawat Lansia, Perawat Medical Bedah, Perawat Luka, Perawat Maternitas, dan Perawat Paliatif.' },
    { q:'Apa saja jenjang pendidikan perawat?', cat:'Janji Temu Perawat', a:'D3 Keperawatan, D4 Keperawatan, Ners/Profesi Ners, dan Spesialis Keperawatan. Jenjang pendidikan ditampilkan transparan di profil setiap perawat.' },
    { q:'Bagaimana cara berdonasi?', cat:'Donasi', a:'(1) Kunjungi halaman Donasi. (2) Pilih campaign yang ingin Anda dukung. (3) Klik Donasi. (4) Pilih nominal atau masukkan jumlah sendiri. (5) Isi nama, email, dan no HP. (6) Konfirmasi donasi.' },
    { q:'Kapan donasi saya dicairkan ke penerima?', cat:'Donasi', a:'Pencairan donasi dilakukan setelah kampanye berakhir atau mencapai target, setelah proses verifikasi oleh tim Akemat. Pemilik campaign wajib mengisi data rekening bank yang valid. Proses transfer 3-7 hari kerja.' },
    { q:'Bagaimana cara membuat campaign donasi?', cat:'Donasi', a:'Daftar sebagai Penggalang Dana, lengkapi profil termasuk data rekening bank, lalu klik + Buat Campaign di dashboard. Isi judul, cerita, target dana, deadline, dan kategori. Campaign akan melalui proses review 1-2 hari kerja sebelum tayang.' },
    { q:'Bagaimana jika perawat tidak datang sesuai jadwal?', cat:'Janji Temu Perawat', a:'Segera hubungi tim Akemat via WhatsApp. Jika perawat membatalkan sepihak tanpa alasan valid, Anda akan mendapat refund 100%. Kami juga akan membantu mencarikan perawat pengganti.' },
    { q:'Apa itu rekening pencairan dan mengapa wajib diisi?', cat:'Rekening', a:'Rekening pencairan adalah rekening bank yang digunakan Akemat untuk mentransfer penghasilan (perawat) atau donasi (pemilik campaign). Tanpa data rekening yang valid, pembayaran tidak dapat diproses. Verifikasi dalam 1x24 jam kerja.' },
    { q:'Apakah data rekening saya aman?', cat:'Rekening', a:'Ya. Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan Akemat yang berwenang. Kami tidak pernah membagikan data rekening kepada pihak ketiga.' },
    { q:'Bagaimana cara daftar sebagai perawat mitra?', cat:'Akun', a:'Klik Daftar dan pilih peran Perawat. Lengkapi data: nama, kontak, spesialisasi, pendidikan, kota, tarif per jam, bio, dan jadwal ketersediaan. Tambahkan data rekening untuk pencairan. Tim kami akan melakukan verifikasi dalam 2-3 hari kerja.' },
    { q:'Berapa perawat menerima dari setiap janji temu?', cat:'Janji Temu Perawat', a:'Perawat menerima 80% dari total nilai janji temu. Contoh: tarif Rp 150.000/jam x 3 jam = Rp 450.000 total. Perawat menerima Rp 360.000 (80%). Penghasilan dicairkan setiap minggu.', highlight:'Penghasilan Anda = tarif per jam x durasi x 80%' },
    { q:'Apakah ada garansi keamanan bertransaksi?', cat:'Janji Temu Perawat', a:'Ya. Semua pembayaran janji temu diproses melalui DOKU (payment gateway berlisensi Bank Indonesia). Data transaksi dienkripsi dengan standar industri.' },
  ];
  const faqCats = ['Janji Temu Perawat','Donasi','Rekening','Akun'];

  function faqItemHTML(f, i){
    var h = '<div class="faq-item">';
    h += '<button class="faq-q" data-faq="'+i+'">'+esc(f.q)+'<span class="faq-icon">+</span></button>';
    h += '<div class="faq-a" id="faq-a-'+i+'">'+esc(f.a);
    if(f.highlight) h += '<div class="faq-highlight">&#128161; <strong>'+esc(f.highlight)+'</strong></div>';
    h += '</div></div>';
    return h;
  }

  function renderFaqList(activeCat){
    const list = activeCat==='Semua' ? faqs : faqs.filter(f=>f.cat===activeCat);
    const listEl = document.getElementById('faqList');
    listEl.innerHTML = list.map((f,i)=>faqItemHTML(f, faqs.indexOf(f))).join('') || emptyState('Belum ada pertanyaan di kategori ini.');
    listEl.querySelectorAll('.faq-q').forEach(function(btn){
      btn.addEventListener('click',function(){
        var idx = btn.dataset.faq;
        var ans = document.getElementById('faq-a-'+idx);
        var open = btn.classList.toggle('open');
        ans.classList.toggle('open', open);
      });
    });
  }

  var faqHTML = '<div class="tnc-faq-page">';
  faqHTML += '<p class="eyebrow">Pertanyaan umum</p>';
  faqHTML += '<h1>FAQ — Pertanyaan yang Sering Ditanyakan</h1>';
  faqHTML += '<p class="lead">Temukan jawaban atas pertanyaan umum seputar Akemat Foundation. Tidak menemukan jawaban? <a href="https://wa.me/6285196407117">Hubungi kami</a>.</p>';
  faqHTML += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px" id="faqCatRow">';
  faqHTML += '<button class="f-chip active" data-faq-cat="Semua">Semua</button>';
  faqCats.forEach(function(cat){
    faqHTML += '<button class="f-chip" data-faq-cat="'+cat+'">'+cat+'</button>';
  });
  faqHTML += '</div><div id="faqList"></div>';
  faqHTML += '<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:24px;margin-top:32px;text-align:center">';
  faqHTML += '<h3 style="margin-bottom:8px">Masih ada pertanyaan?</h3>';
  faqHTML += '<p style="margin-bottom:16px">Tim kami siap membantu Senin-Sabtu, 08.00-17.00 WIB.</p>';
  faqHTML += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">';
  faqHTML += '<a href="https://wa.me/6285196407117" target="_blank" class="btn btn-primary">WhatsApp Kami</a>';
  faqHTML += '<a href="mailto:customercare@akematfoundation.org" class="btn btn-outline">Email Kami</a>';
  faqHTML += '<a href="#tnc" class="btn btn-ghost">Syarat &amp; Ketentuan</a>';
  faqHTML += '</div></div></div>';

  app.innerHTML = faqHTML + renderFooterSection();

  renderFaqList('Semua');
  document.getElementById('faqCatRow')?.addEventListener('click', function(e){
    const chip = e.target.closest('[data-faq-cat]');
    if(!chip) return;
    document.querySelectorAll('#faqCatRow .f-chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    renderFaqList(chip.dataset.faqCat);
  });
}


// ── Push Notification ──────────────────────────────────────
// applicationServerKey butuh format Uint8Array, bukan string base64url
// mentah — konversi standar sesuai dokumentasi Push API.
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function getPushSubscription(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}
async function enablePushNotifications(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)){ toast('Browser ini tidak mendukung notifikasi push.','e'); return false; }
  if(Store.backend !== 'remote'){ toast('Notifikasi belum didukung di mode lokal.','e'); return false; }
  try {
    const cfg = await (await fetch(`${API_BASE}/config`)).json();
    if(!cfg?.vapidPublicKey){ toast('Notifikasi belum diaktifkan admin di server ini.','e'); return false; }
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ toast('Izin notifikasi ditolak.','e'); return false; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey) });
    await apiFetch('push-subscribe', { action:'subscribe', subscription: sub.toJSON() });
    toast('Notifikasi diaktifkan.','s');
    return true;
  } catch(e){ toast('Gagal mengaktifkan notifikasi: '+(e.message||'coba lagi.'),'e'); return false; }
}
async function disablePushNotifications(){
  try {
    const sub = await getPushSubscription();
    if(sub){
      await apiFetch('push-subscribe', { action:'unsubscribe', subscription: sub.toJSON() }).catch(()=>{});
      await sub.unsubscribe();
    }
    toast('Notifikasi dinonaktifkan.','s');
    return true;
  } catch(e){ toast('Gagal menonaktifkan: '+(e.message||'coba lagi.'),'e'); return false; }
}

// ── Profile ─────────────────────────────────────────────────
async function renderProfile(){
  const u = Store.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  const bank = u.bankInfo || {};
  const np   = u.np || {};
  let nurseAvailable = 0, nursePayouts = [];
  if (u.role === 'nurse') {
    [nurseAvailable, nursePayouts] = await Promise.all([Store.getNurseAvailablePayout(u.id), Store.getPayoutsByUser(u.id)]);
  }
  let patientProfiles = [];
  if (u.role === 'patient') patientProfiles = await Store.getPatientProfiles(u.id);
  const pushSub = await getPushSubscription();
  const pushOn  = !!pushSub && Notification?.permission === 'granted';

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>${u.role==='patient'?'Profil & Dokumen':'Profil & Rekening'}</h2>
        <p>Kelola informasi pribadi${u.role!=='patient'?' dan data rekening pencairan':''}.</p>
      </div>

      <!-- Profile info -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Informasi Pribadi</h3></div>
        <div class="profile-grid">
          <div class="ff"><label>Nama lengkap</label><input type="text" id="profName" value="${esc(u.name)}" /></div>
          <div class="ff"><label>No. HP</label><input type="tel" id="profPhone" value="${esc(u.phone||'')}" /></div>
          <div class="ff full"><label>Email</label><input type="email" id="profEmail" value="${esc(u.email)}" readonly style="opacity:.6" /></div>
          <div class="ff"><label>Tanggal lahir</label><input type="date" id="profDob" value="${esc(u.dob||'')}" /></div>
          <div class="ff"><label>Jenis kelamin</label><select id="profGender"><option value="">Pilih…</option><option value="Laki-laki" ${u.gender==='Laki-laki'?'selected':''}>Laki-laki</option><option value="Perempuan" ${u.gender==='Perempuan'?'selected':''}>Perempuan</option></select></div>
          <div class="ff full"><label>Alamat</label><input type="text" id="profAddr" value="${esc(u.address||'')}" /></div>
          ${u.role==='donor'?'<div class="ff full"><label>Organisasi / Instansi (opsional)</label><input type="text" id="profOrg" value="'+esc(u.organization||'')+'" /></div>':''}
        </div>
        <button class="btn btn-primary btn-sm" id="btnSaveProfile" style="margin-top:4px">Simpan Profil</button>
      </div>

      <!-- Nurse profile extra -->
      ${u.role==='nurse'?nurseProfileSection(u):''}

      ${u.role==='patient'?patientProfilesSection(patientProfiles):ktpSection(u)}
      ${u.role!=='patient'?bankStatusSection(u):''}
      ${u.role==='nurse'?nursePayoutSection(u, nurseAvailable, nursePayouts):''}

      <div class="dash-section">
        <div class="dash-sh"><h3>🔔 Notifikasi</h3><span class="bank-status ${pushOn?'verified':'empty'}">${pushOn?'✓ Aktif':'✕ Nonaktif'}</span></div>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Dapat pemberitahuan langsung ke HP saat status KTP berubah, janji temu dikonfirmasi/selesai, atau ada donasi baru masuk ke campaign Anda.</p>
        <button class="btn ${pushOn?'btn-outline':'btn-primary'} btn-sm" id="btnTogglePush">${pushOn?'Matikan Notifikasi':'Aktifkan Notifikasi'}</button>
      </div>

      <div class="dash-section">
        <div class="dash-sh"><h3>💬 Bantuan & Informasi</h3></div>
        <div>
          ${helpLinkRow(ICON.whatsapp, 'Hubungi Customer Service', 'https://wa.me/6285196407117?text=Halo%20Akemat%20Foundation%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20Anda.', true)}
          ${helpLinkRow(ICON.info, 'FAQ', '#faq')}
          ${helpLinkRow(ICON.doc, 'Syarat & Ketentuan', '#tnc')}
          ${helpLinkRow(ICON.shield, 'Kebijakan Privasi', '#privasi')}
        </div>
      </div>

      <div class="dash-section" style="border:1.5px solid #FCA5A5">
        <div class="dash-sh"><h3 style="color:#B91C1C">⚠️ Zona Berbahaya</h3></div>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Menghapus akun akan menghapus data pribadi Anda (nama, KTP, rekening) secara permanen dan Anda tidak bisa login lagi. Riwayat transaksi tetap tersimpan untuk kepatuhan hukum (lihat <a href="#privasi" target="_blank">Kebijakan Privasi</a>), tapi sudah tidak terhubung ke identitas Anda.</p>
        <button class="btn btn-danger btn-sm" id="btnDeleteAccount">Hapus Akun Saya</button>
      </div>
    </div>
  </div>`;

  afterDash();

  if (u.role === 'patient') {
    function openPPModal(p){
      document.getElementById('ppModalTitle').textContent = p ? '🧑‍🤝‍🧑 Edit Profil Pasien' : '🧑‍🤝‍🧑 Tambah Profil Pasien';
      document.getElementById('ppId').value = p ? p.id : '';
      document.getElementById('ppName').value = p ? p.name : '';
      document.getElementById('ppRelationship').value = p ? p.relationship : 'Diri Sendiri';
      document.getElementById('ppDob').value = p ? p.dob : '';
      document.getElementById('ppGender').value = p ? p.gender : '';
      document.getElementById('ppPhone').value = p ? p.phone : '';
      document.getElementById('ppAddress').value = p ? p.address : '';
      document.getElementById('ppNotes').value = p ? p.notes : '';
      openModal('modalPatientProfile');
    }
    document.getElementById('btnAddPatientProfile')?.addEventListener('click', ()=>openPPModal(null));
    document.querySelectorAll('[data-edit-pp]').forEach(b=>b.addEventListener('click', ()=>{
      openPPModal(patientProfiles.find(p=>p.id===b.dataset.editPp));
    }));
    document.querySelectorAll('[data-delete-pp]').forEach(b=>b.addEventListener('click', async ()=>{
      if(!confirm('Hapus profil pasien ini? Riwayat janji temu yang sudah ada tetap tersimpan.')) return;
      try {
        await Store.deletePatientProfile(b.dataset.deletePp);
        toast('Profil pasien dihapus.','s');
        const card = document.getElementById('pp-card-'+b.dataset.deletePp);
        if(card){
          card.style.transition = 'opacity .22s ease, transform .22s ease';
          card.style.opacity = '0'; card.style.transform = 'scale(.97)';
          setTimeout(()=>card.remove(), 220);
        }
      }
      catch(e){ toast('Gagal menghapus: '+(e.message||'coba lagi.'),'e'); }
    }));
    document.getElementById('btnSavePatientProfile')?.addEventListener('click', async (ev)=>{
      const btn = ev.currentTarget;
      if(btn.disabled) return;
      const id   = document.getElementById('ppId')?.value;
      const name = document.getElementById('ppName')?.value.trim();
      const relationship = document.getElementById('ppRelationship')?.value;
      const dob    = document.getElementById('ppDob')?.value;
      const gender = document.getElementById('ppGender')?.value;
      const phone  = document.getElementById('ppPhone')?.value.trim();
      const address= document.getElementById('ppAddress')?.value.trim();
      if(!name||!relationship||!dob||!gender||!phone||!address){ toast('Lengkapi semua data wajib (kecuali Catatan kondisi).','e'); return; }
      const data = { name, relationship, dob, gender, phone, address, notes: document.getElementById('ppNotes')?.value.trim() };
      const orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        if(id) await Store.updatePatientProfile(id, data);
        else   await Store.addPatientProfile({ accountId: u.id, ...data });
        closeModal('modalPatientProfile');
        toast('Profil pasien disimpan.','s');
        renderProfile();
      } catch(e){ toast('Gagal menyimpan: '+(e.message||'coba lagi.'),'e'); }
      finally { btn.disabled = false; btn.textContent = orig; }
    });
    document.querySelectorAll('[data-ktp-for]').forEach(input=>input.addEventListener('change', async ()=>{
      const file = input.files?.[0];
      if(!file) return;
      const pid = input.dataset.ktpFor;
      if(!document.querySelector('[data-consent-for="'+pid+'"]')?.checked){
        toast('Centang persetujuan penggunaan foto KTP terlebih dahulu.','e'); input.value=''; return;
      }
      if(file.size > 5*1024*1024){ toast('Ukuran file maksimal 5MB.','e'); input.value=''; return; }
      try {
        const dataUrl = await fileToResizedDataUrl(file, 1400, 0.85);
        await Store.updatePatientProfile(pid, { ktpUrl: dataUrl, ktpStatus: 'uploaded' });
        toast('KTP berhasil diunggah. Menunggu verifikasi tim Akemat.','s');
        renderProfile();
      } catch(e){ toast(e.message||'Gagal mengunggah KTP.','e'); }
    }));
  }

  document.getElementById('btnAjukanPencairanNurse')?.addEventListener('click', async ()=>{
    const available = await Store.getNurseAvailablePayout(u.id);
    const bank = u.bankInfo||{};
    if(!bank.accountNumber){ toast('Isi data rekening terlebih dahulu.','e'); return; }
    if(available<=0){ toast('Belum ada saldo yang bisa dicairkan.','e'); return; }
    if(!confirm('Ajukan pencairan '+rpFmt(available)+' ke '+bank.bankName+' '+bank.accountNumber+'?')) return;
    await Store.addPayoutRequest({
      recipientType:'nurse', userId:u.id, amount:available,
      bankName:bank.bankName, bankAccountNumber:bank.accountNumber, bankAccountName:bank.accountName,
    });
    toast('Pengajuan pencairan terkirim. Diproses 1-3 hari kerja.','s');
    renderProfile();
  });

  document.getElementById('btnSaveKtp')?.addEventListener('click', async ()=>{
    const file = document.getElementById('profKtp')?.files?.[0];
    if(!file){ toast('Pilih foto KTP terlebih dahulu.','e'); return; }
    if(file.size > 5*1024*1024){ toast('Ukuran file maksimal 5MB.','e'); return; }
    if(!document.getElementById('ktpConsent')?.checked){ toast('Centang persetujuan penggunaan foto KTP terlebih dahulu.','e'); return; }
    const btn = document.getElementById('btnSaveKtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengunggah…';
    try {
      // maxDim lebih besar dari foto campaign (1000px) — teks NIK/alamat di
      // KTP harus tetap terbaca setelah dikompres, bukan cuma "cukup bagus".
      const dataUrl = await fileToResizedDataUrl(file, 1400, 0.85);
      await Store.updateUser(u.id, { ktpUrl: dataUrl, ktpStatus: 'uploaded' });
      toast('KTP berhasil diunggah. Menunggu verifikasi tim Akemat.','s');
      renderProfile();
    } catch(e) {
      toast(e.message||'Gagal mengunggah KTP.','e');
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Profile form save handlers
  document.getElementById('btnSaveProfile')?.addEventListener('click', async ()=>{
    const name   = document.getElementById('profName')?.value.trim();
    const phone  = document.getElementById('profPhone')?.value.trim();
    const dob    = document.getElementById('profDob')?.value;
    const gender = document.getElementById('profGender')?.value;
    const address= document.getElementById('profAddr')?.value.trim();
    if(!name||!phone||!dob||!gender||!address){ toast('Lengkapi semua data wajib (kecuali Organisasi).','e'); return; }
    const upd = { name, phone, dob, gender, address };
    if(u.role==='donor') upd.organization = document.getElementById('profOrg')?.value.trim();
    await Store.updateUser(u.id, upd);
    toast('Profil berhasil disimpan.','s');
  });

  document.getElementById('btnSaveNP')?.addEventListener('click', async ()=>{
    const sched = [...document.querySelectorAll('#nurseScheduleWrap input:checked')].map(cb=>cb.value);
    const spec  = document.getElementById('npSpec')?.value;
    await Store.updateUser(u.id, {np:{...u.np,
      specialty: spec,
      education: document.getElementById('npEdu')?.value,
      loc:       document.getElementById('npLoc')?.value.trim(),
      price:     parseInt(document.getElementById('npPrice')?.value)||u.np?.price,
      bio:       document.getElementById('npBio')?.value.trim(),
      schedule:  sched.length ? sched : u.np?.schedule,
      services:  BOOKING_SERVICES[spec] || u.np?.services,
    }});
    toast('Profil perawat berhasil disimpan.','s');
  });

  document.getElementById('btnSaveBank')?.addEventListener('click', async ()=>{
    const bankName = document.getElementById('bankNameInput')?.value;
    const accNum   = document.getElementById('bankAccNum')?.value.trim();
    const accName  = document.getElementById('bankAccName')?.value.trim();
    if(!bankName||!accNum||!accName){ toast('Lengkapi semua data rekening.','e'); return; }
    if(!document.getElementById('bankConsent')?.checked){ toast('Centang persetujuan penggunaan data rekening terlebih dahulu.','e'); return; }
    await Store.updateUser(u.id, { bankInfo:{ bankName, accountNumber:accNum, accountName:accName, verified:false }});
    toast('Data rekening disimpan. Verifikasi dalam 1×24 jam kerja.','s');
    setTimeout(()=>renderProfile(), 800);
  });

  document.getElementById('btnTogglePush')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    btn.disabled = true;
    const ok = pushOn ? await disablePushNotifications() : await enablePushNotifications();
    if(ok) renderProfile(); else btn.disabled = false;
  });

  document.getElementById('btnDeleteAccount')?.addEventListener('click', async ()=>{
    const typed = prompt('Tindakan ini PERMANEN dan tidak bisa dibatalkan.\n\nKetik HAPUS AKUN (huruf besar semua) untuk konfirmasi:');
    if(typed !== 'HAPUS AKUN'){ if(typed !== null) toast('Konfirmasi tidak cocok — akun tidak dihapus.','e'); return; }
    const btn = document.getElementById('btnDeleteAccount');
    btn.disabled = true; btn.textContent = 'Menghapus…';
    try {
      await Store.deleteAccount();
      toast('Akun Anda telah dihapus.','s');
      navigate('#home');
    } catch(e) {
      toast('Gagal menghapus akun: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = 'Hapus Akun Saya';
    }
  });
}

// ── Modals ──────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); document.body.style.overflow='hidden'; document.body.classList.add('modal-open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; document.body.classList.remove('modal-open'); }

// ── Custom select (bottom-sheet di HP, dropdown ala app) ────────
// Native <select> dibutuhkan browser jelek/tidak konsisten pas dibuka di
// Android (jadi picker gelap bawaan OS, tidak mengikuti tema app sama
// sekali). Elemen <select> ASLI tetap ada di DOM (disembunyikan visual)
// supaya semua logika filter yang sudah baca .value / dengar event
// 'change' tetap jalan tanpa perlu diubah — cuma cara BUKANYA yang diganti
// jadi bottom-sheet custom yang gayanya sama seperti modal lain di app ini.
let _cselOverlay = null;
function ensureCselOverlay(){
  if(_cselOverlay) return _cselOverlay;
  const el = document.createElement('div');
  el.className = 'csel-overlay';
  el.innerHTML = '<div class="csel-sheet"><div class="csel-handle"></div><div class="csel-title" id="cselTitle"></div><div class="csel-options" id="cselOptions"></div></div>';
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
}
function openCselSheet(selectEl, title, onPick){
  const overlay = ensureCselOverlay();
  document.getElementById('cselTitle').textContent = title;
  const optsWrap = document.getElementById('cselOptions');
  optsWrap.innerHTML = [...selectEl.options].map(o=>
    '<button type="button" class="csel-opt'+(o.value===selectEl.value?' active':'')+'" data-value="'+esc(o.value)+'">'+
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
}
function enhanceSelect(selectEl, title){
  if(!selectEl || selectEl.dataset.cselEnhanced) return;
  selectEl.dataset.cselEnhanced = '1';
  selectEl.classList.add('csel-native-hidden');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csel-trigger';
  selectEl.insertAdjacentElement('afterend', trigger);
  function render(){
    const label = selectEl.options[selectEl.selectedIndex]?.textContent || '';
    trigger.innerHTML = '<span>'+esc(label)+'</span><span class="csel-chevron">'+ICON.chevronDown+'</span>';
  }
  render();
  trigger.addEventListener('click', ()=>openCselSheet(selectEl, title, render));
  selectEl.addEventListener('change', render); // jaga-jaga ada kode lain yang set .value lalu dispatch 'change' manual
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
  html += '<a href="#" class="logo"><svg class="logo-mark" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#F2A541"/><path d="M24 36c-7-5.5-13-10.8-13-17A8 8 0 0 1 24 13a8 8 0 0 1 13 6c0 6.2-6 11.5-13 17z" fill="#FBF7F1"/></svg><span>Akemat <strong>Foundation</strong></span></a>';
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
  html += '<p><a href="#tnc" style="color:#90A89E">Syarat &amp; Ketentuan</a> &middot; <a href="#privasi" style="color:#90A89E">Kebijakan Privasi</a> &middot; <a href="#faq" style="color:#90A89E">FAQ</a></p>';
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
      banner.textContent = 'Tidak ada koneksi internet';
      banner.className = 'show offline';
    }
    function setOnline(){
      if(!banner.classList.contains('offline')) return; // skip di load pertama
      banner.textContent = 'Koneksi tersambung lagi';
      banner.className = 'show online';
      hideTimer = setTimeout(()=>banner.classList.remove('show'), 2500);
    }
    window.addEventListener('offline', setOffline);
    window.addEventListener('online', setOnline);
    if(!navigator.onLine) setOffline();
  })();
});
