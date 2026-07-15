'use strict';
// =========================================================
// Akemat Foundation v3 — SPA App
// =========================================================

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

// ── Helper: render pay button without nested template literals ──
function payBtnHTML(status, id){
  if(status==='pending' || status==='confirmed'){
    var lbl = status==='pending' ? '💳 Bayar' : '💳 Lunasi';
    return '<button class="btn btn-xs btn-accent" style="color:#1F4D3F;white-space:nowrap" data-pay="'+id+'">'+lbl+'</button>';
  }
  return '<span style="color:#9CA3AF">—</span>';
}

function toast(msg, type=''){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'vis' + (type ? ' t'+type[0] : '');
  clearTimeout(t._t);
  t._t = setTimeout(()=>{ t.className=''; }, 3500);
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

async function route(){
  const hash  = location.hash.replace('#','') || '';
  const parts = hash.split('/');
  const page  = parts[0];
  const id    = parts[1];
  renderHeader();
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
    case 'faq':      renderFAQ();         break;
    default:         await renderHome();
  }
  window.scrollTo(0,0);
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
      ? '<div class="header-user"><div class="header-avatar">'+initials(u.name)+'</div><span class="header-name">'+esc(u.name.split(' ')[0])+'</span><a href="#dashboard" class="btn btn-sm btn-outline">Dashboard</a></div>'
      : '<div style="display:flex;gap:8px"><a href="#login" class="btn btn-sm btn-outline" style="padding:7px 16px;font-size:.82rem">Masuk</a><a href="#register" class="btn btn-sm btn-accent" style="padding:7px 16px;font-size:.82rem;color:#1F4D3F">Daftar</a></div>'
    }
  `;
}

// ── Home ───────────────────────────────────────────────────
async function renderHome(){
  const [nursesList, campaigns] = await Promise.all([Store.getNurses(), Store.getCampaigns()]);
  const nurses    = nursesList.length;
  const totalDon  = campaigns.reduce((s,c)=>s+c.current,0);

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
          <p>Bergabunglah sebagai mitra perawat. Anda menerima 80% dari setiap booking yang berhasil dilakukan.</p>
          <a href="#register" class="btn btn-outline btn-sm" style="margin-top:8px;align-self:flex-start">Daftar mitra →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Specialties showcase -->
  <section class="pub-section alt">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Spesialisasi perawat</p>
        <h2>7 bidang keahlian tersedia</h2>
      </div>
      <div class="spec-grid" id="specGrid">
        ${SPECIALTIES.map(s=>'<a href="#perawat" data-spec="'+s+'" class="spec-card"><span class="spec-icon">'+SPECIALTY_ICONS[s]+'</span><span class="spec-label">'+esc(s)+'</span></a>').join('')}
      </div>      </div>
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

async function renderNurseList(){
  const nurses = await Store.getNurses();
  const allNurses = nurses;
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
        <select id="nurseSpec" style="max-width:200px">
          <option value="">Semua spesialisasi</option>
          ${SPECIALTIES.map(s=>'<option value="'+s+'">'+s+'</option>').join('')}
        </select>
        <select id="nurseEdu" style="max-width:190px">
          <option value="">Semua pendidikan</option>
          ${EDUCATION_LEVELS.map(e=>'<option value="'+e+'">'+e+'</option>').join('')}
        </select>
        <button class="f-chip active" id="availFilter" data-avail="0">Semua</button>
        <button class="f-chip" id="availFilterOn" data-avail="1">Tersedia sekarang</button>
      </div>

      <div class="nurse-grid" id="nurseGrid">
        ${nurses.map(n=>nurseCard(n)).join('') || emptyState('Belum ada perawat terdaftar.')}
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
    document.getElementById('nurseGrid').innerHTML = list.map(n=>nurseCard(n)).join('') || emptyState('Tidak ada perawat yang cocok dengan filter.');
  };
  document.getElementById('nurseSearch')?.addEventListener('input', grid);
  document.getElementById('nurseSpec')?.addEventListener('change', grid);
  document.getElementById('nurseEdu')?.addEventListener('change', grid);
  document.getElementById('availFilter')?.addEventListener('click', ()=>{
    avail=false;
    document.getElementById('availFilter').classList.add('active');
    document.getElementById('availFilterOn').classList.remove('active');
    grid();
  });
  document.getElementById('availFilterOn')?.addEventListener('click', ()=>{
    avail=true;
    document.getElementById('availFilterOn').classList.add('active');
    document.getElementById('availFilter').classList.remove('active');
    grid();
  });
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
      ${p.avail?'<button class="btn btn-primary btn-sm" onclick="openBookingModal(\''+n.id+'\')">Pesan</button>':'<button class="btn btn-ghost btn-sm" disabled>Tidak tersedia</button>'}
    </div>
  </div>`;
}

// ── Nurse Detail ────────────────────────────────────────────
async function renderNurseDetail(id){
  const n = await Store.getUserById(id);
  if(!n || !n.np){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Perawat tidak ditemukan.</p></div>'; return; }
  const p = n.np;

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
              ${p.verified?'<span class="badge badge-green">✓ Terverifikasi</span>':'<span class="badge badge-amber">Menunggu verifikasi</span>'}
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
            ${[
              {name:'Keluarga Bapak Hendra', rating:5, date:'3 hari lalu', text:'Sangat profesional dan sabar. Ibu saya merasa nyaman dan perkembangannya baik.'},
              {name:'Ibu Rini Hartati', rating:5, date:'2 minggu lalu', text:'Perawat yang sangat telaten. Selalu tepat waktu dan berkomunikasi baik dengan keluarga.'},
              {name:'Anonim', rating:4, date:'1 bulan lalu', text:'Baik dan terampil. Sangat membantu di masa pemulihan ibu saya.'},
            ].map(function(r){
              var stars='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);
              return '<div style="padding:14px;background:var(--bg-alt);border-radius:10px">'+
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
                '<span style="font-weight:700;font-size:.86rem">'+r.name+'</span>'+
                '<span style="font-size:.76rem;color:var(--soft)">'+r.date+'</span></div>'+
                '<div style="color:#F59E0B;font-size:.84rem;margin-bottom:5px">'+stars+'</div>'+
                '<p style="font-size:.88rem;margin:0">'+r.text+'</p></div>';
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Booking widget -->
    <div>
      <div class="book-widget">
        <h3>Pesan ${esc(n.name.split(',')[0])}</h3>
        <div class="book-price">${rpFmt(p.price)} <small>/ jam</small></div>

        ${!p.avail ? '<div class="bank-warning">⚠️ Perawat ini sedang tidak tersedia. Coba cari perawat lain.</div>' : ''}

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

        <!-- Fee breakdown -->
        <div class="fee-box">
          <div class="fee-row">
            <span class="fee-label">Harga perawat</span>
            <span class="fee-value" id="bkPriceBase">${rpFmt(p.price)} × 2 jam</span>
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
          Pesan Sekarang
        </button>
        <p style="font-size:.72rem;color:var(--soft);text-align:center;margin-top:8px;line-height:1.5">
          Pembayaran dikonfirmasi via WhatsApp setelah booking. 
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

  // Duration / time selection
  let selDur = 2;
  document.querySelectorAll('.dur-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selDur = parseInt(btn.dataset.dur);
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
    const total = p.price * selDur;
    const fee   = Math.round(total * FEE.BOOKING);
    document.getElementById('bkPriceBase').textContent = rpFmt(p.price)+' × '+selDur+' jam';
    document.getElementById('bkTotal').textContent     = rpFmt(total);
    document.getElementById('bkFee').textContent       = rpFmt(fee);
    document.getElementById('bkNursePay').textContent  = rpFmt(total - fee);
  }
  updateBookCalc();

  // Book button
  document.getElementById('btnBook')?.addEventListener('click', async ()=>{
    const u = Store.getCurrentUser();
    if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
    if(u.role !== 'patient'){ toast('Hanya pasien yang bisa memesan perawat.','e'); return; }
    const date    = document.getElementById('bkDate')?.value;
    const time    = document.querySelector('.time-btn.active')?.dataset.time || '09:00';
    const dur     = selDur;
    const service = document.getElementById('bkService')?.value || p.specialty;
    const address = document.getElementById('bkAddress')?.value.trim();
    const notes   = document.getElementById('bkNotes')?.value.trim();
    if(!date)    { toast('Pilih tanggal kunjungan.','e'); return; }
    if(!address) { toast('Isi alamat kunjungan.','e'); return; }

    const total = p.price * dur;
    const booking = await Store.addBooking({
      patientId: u.id, nurseId: n.id,
      nurseName: n.name, nurseSpecialty: p.specialty,
      service, date, time, duration: dur, address, notes,
      totalCost: total,
    });
    const btn2 = document.getElementById('btnBook');
    const orig2 = btn2?.textContent;
    if(btn2){ btn2.disabled=true; btn2.textContent='Memproses pembayaran…'; }
    try {
      await Payment.payBooking({
        bookingId:   booking.id,
        totalCost:   total,
        nurseName:   n.name,
        service,
        buyerName:   u.name,
        buyerEmail:  u.email,
        buyerPhone:  u.phone||'08000000000',
      });
    } catch(err){
      // Booking tersimpan (belum lunas) tapi redirect ke iPaymu gagal — tampilkan
      // alasan sebenarnya, jangan sembunyikan di balik pesan sukses yang menyesatkan.
      toast('Booking tersimpan, tapi gagal membuka pembayaran: '+(err.message||'coba lagi.'), 'e');
      setTimeout(()=>navigate('#dashboard'), 1800);
      console.error('[Payment] iPaymu redirect failed:', err.message);
    }
    if(btn2){ btn2.disabled=false; btn2.textContent=orig2; }
  });
}

// ── Campaign List ───────────────────────────────────────────
async function renderCampaignList(){
  const campaigns = await Store.getCampaigns();
  app.innerHTML = `
  <section class="pub-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Campaign donasi</p>
        <h2>Bantu mereka yang membutuhkan perawatan</h2>
        <p class="lead">5% biaya layanan digunakan untuk operasional platform. 95% donasi langsung ke campaign.</p>
      </div>
      <div class="filter-row">
        <div class="search-wrap">
          <span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input type="text" id="camSearch" placeholder="Cari campaign…" />
        </div>
        <button class="f-chip active" data-cat="">Semua</button>
        ${SPECIALTIES.map(s=>chipHTML(s,SPECIALTY_ICONS[s]+' '+s.replace('Perawat ',''),false)).join('')}
      </div>
      <div class="campaign-grid" id="camGrid">
        ${campaigns.map(c=>campaignCard(c)).join('') || emptyState('Belum ada campaign.')}
      </div>
      ${Store.getCurrentUser()?.role==='donor'?'<div style="text-align:center;margin-top:32px"><button class="btn btn-accent" onclick="openCreateCampaignModal()">+ Buat Campaign Baru</button></div>':''}
    </div>
  </section>
  ${renderFooterSection()}`;

  let cat = '';
  document.getElementById('camSearch')?.addEventListener('input', filterCam);
  document.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-cat]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      cat = btn.dataset.cat;
      filterCam();
    });
  });
  function filterCam(){
    const q  = document.getElementById('camSearch')?.value.toLowerCase()||'';
    const list = campaigns.filter(c=>{
      const matchQ  = !q || c.title.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q);
      const matchCat= !cat || c.category === cat;
      return matchQ && matchCat;
    });
    document.getElementById('camGrid').innerHTML = list.map(c=>campaignCard(c)).join('') || emptyState('Tidak ada campaign yang cocok.');
  }
}

function campaignCard(c){
  const p     = pct(c.current, c.target);
  const color = CAM_COLORS[c.category] || '#1F4D3F';
  const cls   = p >= 100 ? 'high' : p >= 80 ? 'urgent' : '';
  return `
  <div class="campaign-card">
    <div class="cam-banner" style="background:${color}20">
      <span>${SPECIALTY_ICONS[c.category]||'❤️'}</span>
      ${c.verified?'<span class="cam-verified">✓ Terverifikasi</span>':''}
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
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:18px">
          <div>${specBadge(c.category||'Donasi')}</div>
          ${c.verified?'<span class="badge badge-green">✓ Campaign Terverifikasi</span>':'<span class="badge badge-amber">Belum terverifikasi</span>'}
        </div>
        <h2 style="font-size:1.3rem;margin-bottom:16px">${esc(c.title)}</h2>
        <p style="font-size:.82rem;color:var(--soft);margin-bottom:18px">Campaign oleh <strong>${esc(c.creatorName)}</strong> · Deadline: ${esc(c.deadline)}</p>

        <!-- Campaign bank info -->
        <div style="background:var(--bg-alt);border-radius:var(--r-sm);padding:14px;margin-bottom:18px">
          <h4 style="font-family:var(--font-d);font-weight:700;font-size:.85rem;margin:0 0 8px;color:var(--primary)">🏦 Rekening penerima dana campaign</h4>
          ${c.bankInfo?.accountNumber
            ? '<div style="display:flex;gap:20px;flex-wrap:wrap">'+
               '<div><span style="font-size:.76rem;color:var(--soft);display:block">Bank</span><strong>'+esc(c.bankInfo.bankName)+'</strong></div>'+
               '<div><span style="font-size:.76rem;color:var(--soft);display:block">No. Rekening</span><strong style="font-family:Courier New,monospace">'+esc(c.bankInfo.accountNumber)+'</strong></div>'+
               '<div><span style="font-size:.76rem;color:var(--soft);display:block">Atas Nama</span><strong>'+esc(c.bankInfo.accountName)+'</strong></div></div>'+
               (c.bankInfo.verified?'<span class="bank-status verified" style="margin-top:8px;display:inline-flex">✓ Rekening terverifikasi</span>':'<span class="bank-status pending" style="margin-top:8px;display:inline-flex">⏳ Verifikasi rekening</span>')
            : '<p style="margin:0;font-size:.84rem;color:var(--soft)">Rekening belum diisi. Dana akan ditransfer setelah pemilik campaign melengkapi data rekening.</p>'}
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

        <!-- Fee info -->
        <div style="background:var(--bg-alt);border-radius:var(--r-sm);padding:10px;margin-top:12px;font-size:.76rem;color:var(--soft);line-height:1.5">
          ℹ️ <strong style="color:var(--primary)">Transparansi:</strong> 95% donasi langsung ke campaign. 5% biaya layanan platform.
        </div>

        ${doms.length?'<div class="donors-list"><h4 style="font-family:var(--font-d);font-weight:700;font-size:.84rem;margin:0 0 10px">Donatur terakhir</h4>'+doms.map(d=>'<div class="donor-item"><span class="donor-name">'+(d.anonymous?'Anonim':esc(d.donorName))+'</span><span class="donor-amount">'+rpFmt(d.amount)+'</span></div>').join('')+'</div>':''}      </div>
    </div>
  </div>
  ${renderFooterSection()}`;
}

// ── Auth ────────────────────────────────────────────────────
function renderLogin(){
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Masuk ke Akemat</h2>
      <p class="lead">Masuk ke akun Akemat Foundation Anda.</p>
      <div class="ff"><label>Email</label><input type="email" id="loginEmail" placeholder="email@anda.com" /></div>
      <div class="ff"><label>Password</label><input type="password" id="loginPass" placeholder="••••••••" /></div>
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
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPass')?.value;
    const err   = document.getElementById('loginErr');
    const btn   = document.getElementById('btnLogin');
    if(!email||!pass){ err.textContent = 'Isi email dan password.'; return; }
    err.textContent = '';
    btn.disabled = true;
    try {
      const u = await Store.login(email, pass);
      toast('Selamat datang, '+u.name.split(' ')[0]+'!','s');
      navigate('#dashboard');
    } catch(e) {
      err.textContent = e.message || 'Email atau password salah.';
    }
    btn.disabled = false;
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
        <div class="ff"><label>Password baru</label><input type="password" id="fpNewPass" placeholder="Min. 6 karakter" /></div>
        <div class="ff"><label>Konfirmasi password baru</label><input type="password" id="fpNewPass2" placeholder="Ulangi password baru" /></div>
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
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    if(!(await Store.getUserByPhone(phone))){ err.textContent = 'Nomor HP tidak terdaftar.'; return; }
    const btn = document.getElementById('btnFpSendOtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      otpRequestId = await Otp.send(phone);
      verifiedPhone = phone;
      document.getElementById('fpStep1').style.display = 'none';
      document.getElementById('fpStep2').style.display = 'block';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
    }
    btn.disabled = false; btn.textContent = orig;
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
    if(!pass || pass.length < 6){ err.textContent = 'Password minimal 6 karakter.'; return; }
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
          <div class="role-pick-desc">Cari &amp; pesan perawat</div>
        </div>
        <div class="role-pick" data-role="nurse">
          <div class="role-pick-icon">👨‍⚕️</div>
          <div class="role-pick-name">Perawat</div>
          <div class="role-pick-desc">Tawarkan jasa</div>
        </div>
        <div class="role-pick" data-role="donor">
          <div class="role-pick-icon">❤️</div>
          <div class="role-pick-name">Donatur</div>
          <div class="role-pick-desc">Buat &amp; kelola donasi</div>
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
      <div class="ff"><label>Password</label><input type="password" id="regPass" placeholder="Min. 6 karakter" /></div>

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
        Dengan mendaftar, Anda menyetujui <a href="#tnc">Syarat &amp; Ketentuan</a> kami.
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
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    const btn = document.getElementById('btnSendOtp');
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
    }
    btn.disabled = false; btn.textContent = orig;
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
    if(pass.length < 6){ err.textContent='Password minimal 6 karakter.'; return; }
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
  if(!bookings.length) return emptyState(viewerRole==='patient' ? 'Belum ada booking. <a href="#perawat">Cari perawat sekarang</a>.' : 'Belum ada booking masuk.');
  return '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Layanan &amp; Tanggal</th><th>Durasi</th><th>Anda Terima</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    bookings.map(b=>'<tr><td><div style="font-size:.84rem;font-weight:600">'+esc(b.service)+'</div><div style="font-size:.74rem;color:var(--soft);margin-top:2px">'+esc(b.date)+' &middot; '+esc(b.time)+'</div></td><td style="font-size:.82rem">'+b.duration+' jam</td><td style="font-size:.88rem;font-weight:700;color:var(--success);white-space:nowrap">'+rpFmt(b.nursePay||Math.round((b.totalCost||0)*0.8))+'</td><td>'+statusBadge(b.status)+'</td><td style="white-space:nowrap">'+bookingActionsFor(b, viewerRole)+'</td></tr>').join('')+
    '</tbody></table></div>';
}

// viewerRole: 'patient' — pasien lihat booking sendiri, harus bisa langsung bayar
//             'nurse' (default) — perawat lihat booking masuk, aksi terima/tolak/selesai
function bookingActionsFor(b, viewerRole){
  var id = b.id;
  if(viewerRole === 'patient'){
    if(b.paymentStatus !== 'paid') return payBtnHTML(b.status, id);
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
    '<div class="bank-warning">⚠️ <strong>Wajib diisi:</strong> Data rekening diperlukan untuk pencairan pembayaran booking dan donasi.</div>'+
    bankDisplay+
    '<div class="profile-grid" style="margin-top:14px">'+
    '<div class="ff full"><label>Nama Bank</label><select id="bankNameInput">'+optionHTML('','Pilih bank…',!bank.bankName)+BANKS.map(function(b){return optionHTML(b,b,bank.bankName===b);}).join('')+'</select></div>'+
    '<div class="ff"><label>Nomor Rekening</label><input type="text" id="bankAccNum" value="'+esc(bank.accountNumber||'')+'" placeholder="Nomor rekening" /></div>'+
    '<div class="ff"><label>Nama Pemilik</label><input type="text" id="bankAccName" value="'+esc(bank.accountName||'')+'" placeholder="Sesuai buku tabungan" /></div>'+
    '</div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:6px 0 12px">Verifikasi dalam 1×24 jam kerja.</p>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveBank">Simpan Data Rekening</button></div>';
}

function ktpSection(u){
  var status = u.ktpStatus || 'pending';
  var cls    = status==='verified' ? 'verified' : status==='uploaded' ? 'pending' : 'empty';
  var lbl    = status==='verified' ? '✓ Terverifikasi' : status==='uploaded' ? '⏳ Menunggu verifikasi' : '❌ Belum diunggah';
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>📎 Verifikasi Identitas (KTP)</h3><span class="bank-status '+cls+'">'+lbl+'</span></div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Wajib diunggah sebelum booking/campaign pertama Anda. Format JPG/PNG/PDF maks. 2MB.</p>'+
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border:1.5px dashed var(--border);border-radius:var(--r-sm);background:var(--bg-alt)">'+
    '<span style="font-size:1.4rem">🪪</span>'+
    '<div><div style="font-family:var(--font-d);font-weight:600;font-size:.84rem;color:var(--primary)" id="ktpFilename">'+(status!=='pending'?'KTP tersimpan — klik untuk ganti':'Pilih file KTP')+'</div>'+
    '<div style="font-size:.74rem;color:var(--soft)">Klik untuk upload</div></div>'+
    '<input type="file" id="profKtp" accept="image/jpeg,image/png,image/gif,.pdf" style="display:none" onchange="document.getElementById(\'ktpFilename\').textContent=this.files[0]?.name||\'Pilih file KTP\'" />'+
    '</label>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveKtp" style="margin-top:12px">Simpan KTP</button></div>';
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
      ['#dashboard','🏠','Dashboard'],['#perawat','🔍','Cari Perawat'],['#donasi','❤️','Donasi'],['#profil','👤','Profil & Dokumen'],
    ],
    nurse: [
      ['#dashboard','🏠','Dashboard'],['#perawat','🔍','Perawat Lain'],['#profil','👤','Profil & Rekening'],
    ],
    donor: [
      ['#dashboard','🏠','Dashboard'],['#donasi','❤️','Semua Campaign'],['#profil','👤','Profil & Rekening'],
    ],
  };
  return `
  <div class="sidebar">
    <div class="sb-user">
      <div class="sb-avatar">${initials(u.name)}</div>
      <div class="sb-name">${esc(u.name)}</div>
      <div class="sb-role">${{patient:'Pasien',nurse:'Perawat',donor:'Donatur'}[u.role]}</div>
      ${u.role!=='patient'?'<div class="sb-bank"><span class="sb-bank-status '+(bankOk?'ok':'warn')+'">'+(bankOk?'&#10003; Rekening terdaftar':'&#9888; Rekening belum diisi')+'</span></div>':u.ktpStatus==='pending'?'<div class="sb-bank"><span class="sb-bank-status warn">&#128206; KTP belum diverifikasi</span></div>':''}
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
  const [bookings, donations] = await Promise.all([Store.getBookingsByPatient(u.id), Store.getDonationsByUser(u.id)]);
  const totalPaid = bookings.filter(b=>b.paymentStatus==='paid').reduce((s,b)=>s+(b.totalCost||0),0);
  const campaignIds = [...new Set(donations.map(d=>d.campaignId).filter(Boolean))];
  const campaignMap = new Map((await Promise.all(campaignIds.map(cid=>Store.getCampaignById(cid)))).filter(Boolean).map(c=>[c.id,c]));

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Selamat datang, ${esc(u.name.split(' ')[0])}!</h2>
        <p>Kelola booking perawat dan riwayat donasi Anda.</p>
        ${u.ktpStatus==='pending'?'<div class="bank-warning" style="margin-top:10px;max-width:500px;border-color:#FDE68A;background:#FFFBEB">&#128206; Upload KTP Anda di <a href="#profil">Profil</a> untuk verifikasi identitas sebelum booking pertama.</div>':''}
      </div>
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:#EEF2FF"><svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <div><div class="stat-val">${bookings.length}</div><div class="stat-lbl">Total booking</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#F0FDF4"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M12 21s-7-4.35-9-9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c-1 4.5-7 9-7 9z"/></svg></div>
          <div><div class="stat-val">${donations.length}</div><div class="stat-lbl">Donasi diberikan</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FFF7ED"><svg viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></div>
          <div><div class="stat-val">${rpFmt(totalPaid)}</div><div class="stat-lbl">Total bayar booking</div></div>
        </div>
      </div>

      <!-- Bookings table -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Riwayat Booking Perawat</h3><a href="#perawat" class="btn btn-primary btn-sm">+ Booking Baru</a></div>
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
          <div><div class="stat-val">${bookings.length}</div><div class="stat-lbl">Total booking masuk</div></div>
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
          <span class="toggle-label" id="availLabel">${p.avail?'✅ Saya tersedia untuk booking':'⏸ Saya tidak tersedia'}</span>
        </div>
        <p style="font-size:.82rem;color:var(--soft);margin-top:8px">Nonaktifkan jika sedang cuti atau penuh jadwal.</p>
      </div>

      <!-- Bookings -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Permintaan & Riwayat Booking</h3></div>
        ${nurseBookingTable(bookings, 'nurse')}
      </div>
    </div>
  </div>`;

  afterDash();
  document.getElementById('availToggle')?.addEventListener('change', async function(){
    const np = {...(u.np||{}), avail: this.checked};
    await Store.updateUser(u.id, {np});
    document.getElementById('availLabel').textContent = this.checked?'✅ Saya tersedia untuk booking':'⏸ Saya tidak tersedia';
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
        <h2>Dashboard Donatur</h2>
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
  html += '<h3>3.1 Booking &amp; Pembayaran</h3><ul><li>Pasien memesan perawat melalui platform dan melakukan pembayaran sesuai tarif yang tertera.</li><li><strong>Struktur biaya booking:</strong> 80% diterima perawat; 20% adalah biaya platform Akemat Foundation.</li><li>Biaya platform digunakan untuk operasional, verifikasi perawat, pengembangan aplikasi, dan layanan pelanggan.</li><li>Tarif per jam ditetapkan oleh perawat dan ditampilkan secara transparan di profil masing-masing.</li></ul>';
  html += '<h3>3.2 Verifikasi Perawat</h3><ul><li>Perawat yang bergabung wajib menyerahkan dokumen identitas, ijazah keperawatan, dan STR untuk proses verifikasi.</li><li>Perawat yang belum terverifikasi ditandai secara jelas di platform.</li></ul>';
  html += '<h3>3.3 Pembatalan &amp; Refund</h3><ul><li>Pembatalan oleh pasien minimal 24 jam sebelum jadwal: refund 100%.</li><li>Pembatalan kurang dari 24 jam: dikenakan biaya admin 10%.</li><li>Pembatalan sepihak oleh perawat tanpa alasan valid: refund 100% ke pasien.</li><li>Proses refund dilakukan dalam 3–5 hari kerja.</li></ul>';
  html += '<h3>3.4 Rekening Perawat</h3><ul><li>Perawat wajib mengisi data rekening bank yang valid untuk pencairan penghasilan.</li><li>Pencairan dilakukan setiap minggu untuk booking yang berstatus selesai.</li><li>Verifikasi rekening dilakukan oleh tim Akemat dalam 1×24 jam kerja.</li></ul></div>';
  html += '<div class="tnc-section"><h2>4. Kampanye Donasi</h2>';
  html += '<h3>4.1 Pembuatan Campaign</h3><ul><li>Donatur yang terverifikasi dapat membuat kampanye donasi untuk membantu pembiayaan layanan perawatan.</li><li>Akemat Foundation berhak menolak atau menghapus kampanye yang tidak sesuai ketentuan.</li></ul>';
  html += '<h3>4.2 Biaya Layanan Donasi</h3><ul><li><strong>Dari setiap donasi: 95% disalurkan ke kampanye; 5% adalah biaya layanan platform.</strong></li><li>Biaya layanan mencakup verifikasi kampanye, operasional sistem pembayaran, dan akuntabilitas donasi.</li></ul>';
  html += '<h3>4.3 Rekening Penerima Campaign</h3><ul><li>Pemilik kampanye wajib mendaftarkan rekening bank yang valid sebagai tujuan pencairan donasi.</li><li>Pencairan dilakukan setelah kampanye berakhir atau mencapai target, setelah proses verifikasi.</li></ul>';
  html += '<h3>4.4 Tanggung Jawab Donatur</h3><ul><li>Donasi yang sudah dikirim tidak dapat ditarik kembali kecuali kampanye dibatalkan oleh Akemat Foundation.</li></ul></div>';
  html += '<div class="tnc-section"><h2>5. Privasi Data</h2>';
  html += '<ul><li>Data pribadi pengguna hanya digunakan untuk keperluan layanan platform.</li><li>Akemat Foundation tidak menjual atau membagikan data pengguna kepada pihak ketiga untuk tujuan komersial.</li><li>Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan yang berwenang.</li></ul></div>';
  html += '<div class="tnc-section"><h2>6. Larangan Penggunaan</h2>';
  html += '<p>Pengguna dilarang keras untuk:</p><ul><li>Membuat kampanye donasi palsu atau menyesatkan.</li><li>Mendaftarkan identitas atau data rekening palsu.</li><li>Menggunakan platform untuk tujuan yang melanggar hukum Indonesia.</li><li>Meminta pembayaran di luar platform kepada perawat atau pasien.</li></ul></div>';
  html += '<div class="tnc-section"><h2>7. Perubahan Ketentuan</h2>';
  html += '<p>Akemat Foundation berhak mengubah Syarat &amp; Ketentuan ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui email terdaftar minimal 7 hari sebelum berlaku.</p></div>';
  html += '<div class="tnc-section"><h2>8. Kontak &amp; Penyelesaian Sengketa</h2>';
  html += '<ul><li>Email: customecare@akematfoundation.org</li><li>WhatsApp: +62 851-9640-7117</li><li>Jam layanan: Senin–Sabtu, 08.00–17.00 WIB</li></ul></div>';
  html += '<div style="margin-top:36px;text-align:center"><a href="#" class="btn btn-primary">Kembali ke Beranda</a> <a href="#faq" class="btn btn-outline" style="margin-left:10px">Lihat FAQ →</a></div>';
  html += '</div>';
  app.innerHTML = html + renderFooterSection();
}

// ── FAQ ────────────────────────────────────────────────────
function renderFAQ(){
  const faqs = [
    { q:'Apa itu Akemat Foundation?', a:'Akemat Foundation adalah yayasan kemanusiaan yang mempertemukan pasien/keluarga dengan perawat profesional untuk layanan home care (perawatan di rumah). Kami juga menyediakan platform donasi untuk membantu pembiayaan perawatan bagi yang membutuhkan.' },
    { q:'Bagaimana cara memesan perawat?', a:'(1) Daftar atau login sebagai pasien. (2) Klik Cari Perawat dan filter berdasarkan spesialisasi, kota, dan ketersediaan. (3) Pilih perawat dan klik Pesan. (4) Isi detail tanggal, waktu, durasi, dan alamat. (5) Konfirmasi booking — perawat akan menghubungi Anda via WhatsApp.' },
    { q:'Berapa biaya platform untuk booking perawat?', a:'Platform Akemat mengambil 20% dari total nilai booking. Artinya, jika Anda membayar Rp 300.000, perawat menerima Rp 240.000 (80%) dan Rp 60.000 (20%) masuk ke operasional platform. Rincian ini selalu ditampilkan transparan sebelum Anda konfirmasi booking.', highlight:'Pasien bayar: 100% → Perawat terima: 80% → Platform: 20%' },
    { q:'Berapa biaya layanan untuk donasi?', a:'Dari setiap donasi yang masuk, 95% langsung disalurkan ke campaign dan 5% adalah biaya layanan platform. Biaya ini mencakup verifikasi campaign, sistem pembayaran, dan operasional.', highlight:'Donasi Anda: 100% → Campaign terima: 95% → Platform: 5%' },
    { q:'Apakah perawat di Akemat sudah terverifikasi?', a:'Perawat dengan lencana Terverifikasi telah melalui proses verifikasi dokumen identitas, ijazah keperawatan, dan STR (Surat Tanda Registrasi). Perawat yang belum terverifikasi diberi label jelas.' },
    { q:'Apa saja spesialisasi perawat yang tersedia?', a:'Akemat memiliki 7 spesialisasi: Perawat Jiwa, Perawat Anak & Bayi, Perawat Lansia, Perawat Medical Bedah, Perawat Luka, Perawat Maternitas, dan Perawat Paliatif.' },
    { q:'Apa saja jenjang pendidikan perawat?', a:'D3 Keperawatan, D4 Keperawatan, Ners/Profesi Ners, dan Spesialis Keperawatan. Jenjang pendidikan ditampilkan transparan di profil setiap perawat.' },
    { q:'Bagaimana cara berdonasi?', a:'(1) Kunjungi halaman Donasi. (2) Pilih campaign yang ingin Anda dukung. (3) Klik Donasi. (4) Pilih nominal atau masukkan jumlah sendiri. (5) Isi nama, email, dan no HP. (6) Konfirmasi donasi.' },
    { q:'Kapan donasi saya dicairkan ke penerima?', a:'Pencairan donasi dilakukan setelah kampanye berakhir atau mencapai target, setelah proses verifikasi oleh tim Akemat. Pemilik campaign wajib mengisi data rekening bank yang valid. Proses transfer 3-7 hari kerja.' },
    { q:'Bagaimana cara membuat campaign donasi?', a:'Daftar sebagai Donatur, lengkapi profil termasuk data rekening bank, lalu klik + Buat Campaign di dashboard. Isi judul, cerita, target dana, deadline, dan kategori. Campaign akan melalui proses review 1-2 hari kerja sebelum tayang.' },
    { q:'Bagaimana jika perawat tidak datang sesuai jadwal?', a:'Segera hubungi tim Akemat via WhatsApp. Jika perawat membatalkan sepihak tanpa alasan valid, Anda akan mendapat refund 100%. Kami juga akan membantu mencarikan perawat pengganti.' },
    { q:'Apa itu rekening pencairan dan mengapa wajib diisi?', a:'Rekening pencairan adalah rekening bank yang digunakan Akemat untuk mentransfer penghasilan (perawat) atau donasi (pemilik campaign). Tanpa data rekening yang valid, pembayaran tidak dapat diproses. Verifikasi dalam 1x24 jam kerja.' },
    { q:'Apakah data rekening saya aman?', a:'Ya. Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan Akemat yang berwenang. Kami tidak pernah membagikan data rekening kepada pihak ketiga.' },
    { q:'Bagaimana cara daftar sebagai perawat mitra?', a:'Klik Daftar dan pilih peran Perawat. Lengkapi data: nama, kontak, spesialisasi, pendidikan, kota, tarif per jam, bio, dan jadwal ketersediaan. Tambahkan data rekening untuk pencairan. Tim kami akan melakukan verifikasi dalam 2-3 hari kerja.' },
    { q:'Berapa perawat menerima dari setiap booking?', a:'Perawat menerima 80% dari total nilai booking. Contoh: tarif Rp 150.000/jam x 3 jam = Rp 450.000 total. Perawat menerima Rp 360.000 (80%). Penghasilan dicairkan setiap minggu.', highlight:'Penghasilan Anda = tarif per jam x durasi x 80%' },
    { q:'Apakah ada garansi keamanan bertransaksi?', a:'Ya. Semua pembayaran booking diproses melalui iPaymu (payment gateway berlisensi Bank Indonesia). Data transaksi dienkripsi dengan standar industri.' },
  ];

  var faqHTML = '<div class="tnc-faq-page">';
  faqHTML += '<p class="eyebrow">Pertanyaan umum</p>';
  faqHTML += '<h1>FAQ — Pertanyaan yang Sering Ditanyakan</h1>';
  faqHTML += '<p class="lead">Temukan jawaban atas pertanyaan umum seputar Akemat Foundation. Tidak menemukan jawaban? <a href="https://wa.me/6285196407117">Hubungi kami</a>.</p>';
  faqHTML += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">';
  faqHTML += '<button class="f-chip active" data-faq-cat="Semua">Semua</button>';
  ['Booking Perawat','Donasi','Rekening','Akun'].forEach(function(cat){
    faqHTML += '<button class="f-chip" data-faq-cat="'+cat+'">'+cat+'</button>';
  });
  faqHTML += '</div><div id="faqList">';
  faqs.forEach(function(f, i){
    faqHTML += '<div class="faq-item">';
    faqHTML += '<button class="faq-q" data-faq="'+i+'">'+esc(f.q)+'<span class="faq-icon">+</span></button>';
    faqHTML += '<div class="faq-a" id="faq-a-'+i+'">'+esc(f.a);
    if(f.highlight) faqHTML += '<div class="faq-highlight">&#128161; <strong>'+esc(f.highlight)+'</strong></div>';
    faqHTML += '</div></div>';
  });
  faqHTML += '</div>';
  faqHTML += '<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:24px;margin-top:32px;text-align:center">';
  faqHTML += '<h3 style="margin-bottom:8px">Masih ada pertanyaan?</h3>';
  faqHTML += '<p style="margin-bottom:16px">Tim kami siap membantu Senin-Sabtu, 08.00-17.00 WIB.</p>';
  faqHTML += '<a href="https://wa.me/6285196407117" target="_blank" class="btn btn-primary">WhatsApp Kami</a> ';
  faqHTML += '<a href="mailto:customecare@akematfoundation.org" class="btn btn-outline" style="margin-left:8px">Email Kami</a> ';
  faqHTML += '<a href="#tnc" class="btn btn-ghost" style="margin-left:8px">Syarat &amp; Ketentuan</a>';
  faqHTML += '</div></div>';

  app.innerHTML = faqHTML + renderFooterSection();

  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var idx = btn.dataset.faq;
      var ans = document.getElementById('faq-a-'+idx);
      var open = btn.classList.toggle('open');
      ans.classList.toggle('open', open);
    });
  });
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
          ${u.role==='patient'?'<div class="ff full"><label>Alamat</label><input type="text" id="profAddr" value="'+esc(u.address||'')+'" /></div>':''}
          ${u.role==='donor'?'<div class="ff full"><label>Organisasi / Instansi</label><input type="text" id="profOrg" value="'+esc(u.organization||'')+'" /></div>':''}
        </div>
        <button class="btn btn-primary btn-sm" id="btnSaveProfile" style="margin-top:4px">Simpan Profil</button>
      </div>

      <!-- Nurse profile extra -->
      ${u.role==='nurse'?nurseProfileSection(u):''}

      ${ktpSection(u)}
      ${u.role!=='patient'?bankStatusSection(u):''}
      ${u.role==='nurse'?nursePayoutSection(u, nurseAvailable, nursePayouts):''}
    </div>
  </div>`;

  afterDash();

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
    if(!file){ toast('Pilih file KTP terlebih dahulu.','e'); return; }
    await Store.updateUser(u.id, { ktpStatus: 'uploaded' });
    toast('KTP berhasil diunggah. Menunggu verifikasi tim Akemat.','s');
    renderProfile();
  });

  // Profile form save handlers
  document.getElementById('btnSaveProfile')?.addEventListener('click', async ()=>{
    const name  = document.getElementById('profName')?.value.trim();
    const phone = document.getElementById('profPhone')?.value.trim();
    if(!name){ toast('Nama wajib diisi.','e'); return; }
    const upd = { name, phone };
    if(u.role==='patient') upd.address      = document.getElementById('profAddr')?.value.trim();
    if(u.role==='donor')   upd.organization = document.getElementById('profOrg')?.value.trim();
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
    await Store.updateUser(u.id, { bankInfo:{ bankName, accountNumber:accNum, accountName:accName, verified:false }});
    toast('Data rekening disimpan. Verifikasi dalam 1×24 jam kerja.','s');
    setTimeout(()=>renderProfile(), 800);
  });
}

// ── Modals ──────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; }

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
    const fee = Math.round(amt*FEE.DONATION);
    document.getElementById('donTotalDisp').textContent  = rpFmt(amt);
    document.getElementById('donFeeDisp').textContent    = rpFmt(fee);
    document.getElementById('donNetDisp').textContent    = rpFmt(amt-fee);
  }

  document.getElementById('btnSubmitDonation').onclick=async()=>{
    const amt   = selAmt||parseInt(document.getElementById('donCustomAmt')?.value)||0;
    const name  = document.getElementById('donBuyerName')?.value.trim();
    const email = document.getElementById('donBuyerEmail')?.value.trim();
    const phone = document.getElementById('donBuyerPhone')?.value.trim();
    const anon  = document.getElementById('donAnon')?.checked;
    const cid   = document.getElementById('donCamId')?.value;
    if(amt<1000){ toast('Minimal donasi Rp 1.000.','e'); return; }
    if(!name||!email||!phone){ toast('Nama, email, dan no HP wajib diisi.','e'); return; }
    const btn = document.getElementById('btnSubmitDonation');
    const orig = btn.textContent;
    btn.disabled=true; btn.textContent='Memproses…';
    try {
      // Simpan metadata donasi (belum lunas) — baru dikreditkan ke campaign
      // setelah iPaymu mengonfirmasi pembayaran di payment-return.html
      await Payment.payDonation({
        amount: amt, campaignId: cid,
        campaignTitle: cam.title, buyerName: name,
        buyerEmail: email, buyerPhone: phone,
        anonymous: anon, donorId: u?.id||'guest',
      });
      // Jika berhasil, browser sudah diarahkan ke halaman pembayaran iPaymu.
    } catch(err) {
      // Pembayaran WAJIB lewat iPaymu — jangan catat donasi tanpa pembayaran nyata.
      toast('Gagal membuat transaksi pembayaran: '+(err.message||'coba lagi.'), 'e');
      console.error('[Payment] iPaymu error:', err.message);
    }
    btn.disabled=false; btn.textContent=orig;
  };
}

function openBookingModal(nurseId){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
  if(u.role!=='patient'){ toast('Hanya pasien yang bisa memesan perawat.','e'); return; }
  navigate('#perawat/'+nurseId);
}

function openCreateCampaignModal(){
  const u = Store.getCurrentUser();
  if(!u||u.role!=='donor'){ toast('Hanya donatur yang bisa membuat campaign.','e'); return; }
  openModal('modalCreateCampaign');
  document.getElementById('btnCreateCampaign').onclick=async ()=>{
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
    await Store.addCampaign({
      title, story, target, deadline, category,
      createdBy: u.id, creatorName: u.name,
      verified: false,
      bankInfo: { bankName, accountNumber:accNum, accountName:accOwner, verified:false },
    });
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

// Global helpers
window.openDonateModal        = openDonateModal;
window.openBookingModal       = openBookingModal;
window.openCreateCampaignModal= openCreateCampaignModal;
window.openEditCampaignModal  = openEditCampaignModal;
window.updateBooking = async (id, status)=>{
  if(status==='confirmed'||status==='completed'){
    const bookings = await Store.getBookings();
    const bk = bookings.find(b=>b.id===id);
    if(!bk || bk.paymentStatus!=='paid'){ toast('Booking belum dibayar oleh pasien.','e'); return; }
  }
  await Store.updateBooking(id, {status});
  toast({confirmed:'Booking dikonfirmasi!',cancelled:'Booking ditolak.',completed:'Booking selesai!'}[status]||'Updated','s');
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
  html += '<a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>';
  html += '<a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 8h2V5h-2a4 4 0 0 0-4 4v2H9v3h2v6h3v-6h2.2l.8-3H14V9c0-.6.4-1 1-1z"/></svg></a>';
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
  html += '<li><a href="mailto:customecare@akematfoundation.org" style="color:#C5D8CD;font-size:.84rem">customecare@akematfoundation.org</a></li>';
  html += '<li><a href="https://wa.me/6285196407117" style="color:#C5D8CD;font-size:.84rem">WhatsApp 0851 9640 7117</a></li>';
  html += '</ul></div>';
  html += '</div>';
  html += '<div class="container footer-bottom">';
  html += '<p>&copy; '+new Date().getFullYear()+' Akemat Foundation. Semua hak cipta dilindungi.</p>';
  html += '<p><a href="#tnc" style="color:#90A89E">Syarat &amp; Ketentuan</a> &middot; <a href="#faq" style="color:#90A89E">FAQ</a></p>';
  html += '</div></footer>';
  return html;
}

function emptyState(msg){
  return '<div class="empty-state"><div class="empty-icon">📭</div><p>' + msg + '</p></div>';
}

// ── openPayBook: trigger iPaymu payment for booking ──────────
async function openPayBook(bookingId){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); return; }
  const bookings = await Store.getBookingsByPatient(u.id);
  const bk = bookings.find(b=>b.id===bookingId);
  if(!bk){ toast('Booking tidak ditemukan.','e'); return; }
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
    window.open('https://wa.me/6285196407117?text='+encodeURIComponent('Halo Akemat, saya ingin bayar booking '+bk.service+' ('+bk.date+'). Nama: '+u.name),'_blank');
    console.error('[Payment] iPaymu redirect failed:', err.message);
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

  // Modal close buttons & overlay click
  document.addEventListener('click',e=>{
    if(e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
    if(e.target.classList.contains('modal-x')) closeModal(e.target.closest('.modal-overlay')?.id);
  });
});
