'use strict';
// =========================================================
// Akemat Foundation v3 — SPA App
// =========================================================

// ── Utility ────────────────────────────────────────────────
function rpFmt(n)     { return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }
function initials(name){ return (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function esc(s)       { return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

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
  return `<span class="badge ${SPECIALTY_COLORS[spec]||'badge-blue'}">${SPECIALTY_ICONS[spec]||'🩺'} ${esc(spec)}</span>`;
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

function route(){
  const hash  = location.hash.replace('#','') || '';
  const parts = hash.split('/');
  const page  = parts[0];
  const id    = parts[1];
  renderHeader();
  switch(page){
    case '':         case 'home':    renderHome();           break;
    case 'perawat':  id ? renderNurseDetail(id) : renderNurseList(); break;
    case 'donasi':   id ? renderCampaignDetail(id) : renderCampaignList(); break;
    case 'login':    renderLogin();       break;
    case 'register': renderRegister();    break;
    case 'dashboard':renderDashboard();   break;
    case 'profil':   renderProfile();     break;
    case 'tnc':      renderTNC();         break;
    case 'faq':      renderFAQ();         break;
    default:         renderHome();
  }
  window.scrollTo(0,0);
}

window.addEventListener('hashchange', route);

// ── Header ─────────────────────────────────────────────────
function renderHeader(){
  const u = DB.getCurrentUser();
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
      ? `<div class="header-user">
           <div class="header-avatar">${initials(u.name)}</div>
           <span class="header-name">${esc(u.name.split(' ')[0])}</span>
           <a href="#dashboard" class="btn btn-sm btn-outline">Dashboard</a>
         </div>`
      : `<div style="display:flex;gap:8px">
           <a href="#login" class="btn btn-sm btn-outline" style="padding:7px 16px;font-size:.82rem">Masuk</a>
           <a href="#register" class="btn btn-sm btn-primary" style="padding:7px 16px;font-size:.82rem">Daftar</a>
         </div>`
    }
  `;
}

// ── Home ───────────────────────────────────────────────────
function renderHome(){
  const nurses    = DB.getNurses().length;
  const campaigns = DB.getCampaigns();
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
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px">
        ${SPECIALTIES.map(s=>`
          <a href="#perawat?specialty=${encodeURIComponent(s)}" 
             style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;transition:var(--tr)" 
             onmouseover="this.style.borderColor='var(--primary-lt)';this.style.transform='translateY(-3px)'" 
             onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
            <span style="font-size:1.8rem">${SPECIALTY_ICONS[s]||'🩺'}</span>
            <span style="font-family:var(--font-d);font-weight:700;font-size:.8rem;color:var(--primary);line-height:1.3">${esc(s)}</span>
          </a>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Active campaigns preview -->
  <section class="pub-section">
    <div class="container">
      <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
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
function renderNurseList(){
  const nurses = DB.getNurses();
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
          ${SPECIALTIES.map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="nurseEdu" style="max-width:190px">
          <option value="">Semua pendidikan</option>
          ${EDUCATION_LEVELS.map(e=>`<option value="${e}">${e}</option>`).join('')}
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
    const list = DB.getNurses({ q, specialty: spec, education: edu, avail });
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
    <div class="nc-svcs">${(p.services||[]).slice(0,3).map(s=>`<span class="svc-chip">${esc(s)}</span>`).join('')}</div>
    <div class="nc-price">${rpFmt(p.price)} <small>/ jam</small></div>
    <div class="nc-actions">
      <a href="#perawat/${n.id}" class="btn btn-outline btn-sm">Lihat profil</a>
      ${p.avail?`<button class="btn btn-primary btn-sm" onclick="openBookingModal('${n.id}')">Pesan</button>`:'<button class="btn btn-ghost btn-sm" disabled>Tidak tersedia</button>'}
    </div>
  </div>`;
}

// ── Nurse Detail ────────────────────────────────────────────
function renderNurseDetail(id){
  const n = DB.getUserById(id);
  if(!n || !n.np){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Perawat tidak ditemukan.</p></div>'; return; }
  const p = n.np;

  app.innerHTML = `
  <div class="container nurse-detail-wrap">
    <div>
      <div class="nurse-profile-card">
        <div class="npro-head">
          <div class="npro-big-avatar">${initials(n.name)}</div>
          <div style="flex:1">
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
            ${(p.services||[]).map(s=>`
              <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-alt);border-radius:8px">
                <span style="color:var(--success);font-size:1rem">✓</span>
                <span style="font-weight:600;font-size:.9rem">${esc(s)}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-jadwal">
          <p style="margin-bottom:10px;font-size:.88rem;color:var(--soft)">Hari-hari perawat tersedia untuk kunjungan:</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=>`
              <span style="padding:8px 14px;border-radius:8px;font-size:.82rem;font-weight:600;font-family:var(--font-d);background:${(p.schedule||[]).includes(d)?'var(--primary)':'var(--bg-alt)'};color:${(p.schedule||[]).includes(d)?'#fff':'var(--soft)'}">
                ${d}
              </span>`).join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-ulasan">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              {name:'Keluarga Bapak Hendra', rating:5, date:'3 hari lalu', text:'Sangat profesional dan sabar. Ibu saya merasa nyaman dan perkembangannya baik.'},
              {name:'Ibu Rini Hartati', rating:5, date:'2 minggu lalu', text:'Perawat yang sangat telaten. Selalu tepat waktu dan berkomunikasi baik dengan keluarga.'},
              {name:'Anonim', rating:4, date:'1 bulan lalu', text:'Baik dan terampil. Sangat membantu di masa pemulihan ibu saya.'},
            ].map(r=>`
              <div style="padding:14px;background:var(--bg-alt);border-radius:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-weight:700;font-size:.86rem">${r.name}</span>
                  <span style="font-size:.76rem;color:var(--soft)">${r.date}</span>
                </div>
                <div style="color:#F59E0B;font-size:.84rem;margin-bottom:5px">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                <p style="font-size:.88rem;margin:0">${r.text}</p>
              </div>`).join('')}
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
            ${['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map((t,i)=>`
              <button class="time-btn${i===0?' active':''}" data-time="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="ff">
          <label>Durasi</label>
          <div class="dur-row">
            ${[1,2,3,4,8].map((d,i)=>`
              <button class="dur-btn${i===1?' active':''}" data-dur="${d}">${d === 8 ? 'Full' : d+'j'}</button>`).join('')}
          </div>
        </div>
        <div class="ff">
          <label>Jenis layanan</label>
          <select id="bkService">
            ${(p.services||[p.specialty]).map(s=>`<option value="${s}">${s}</option>`).join('')}
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
    document.getElementById('bkPriceBase').textContent = `${rpFmt(p.price)} × ${selDur} jam`;
    document.getElementById('bkTotal').textContent     = rpFmt(total);
    document.getElementById('bkFee').textContent       = rpFmt(fee);
    document.getElementById('bkNursePay').textContent  = rpFmt(total - fee);
  }
  updateBookCalc();

  // Book button
  document.getElementById('btnBook')?.addEventListener('click',()=>{
    const u = DB.getCurrentUser();
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
    const booking = DB.addBooking({
      patientId: u.id, nurseId: n.id,
      nurseName: n.name, nurseSpecialty: p.specialty,
      service, date, time, duration: dur, address, notes,
      totalCost: total,
    });
    toast('Booking berhasil dibuat! Konfirmasi akan dikirim via WhatsApp.','s');
    setTimeout(()=>navigate('#dashboard'), 1500);
  });
}

// ── Campaign List ───────────────────────────────────────────
function renderCampaignList(){
  const campaigns = DB.getCampaigns();
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
        ${SPECIALTIES.map(s=>`<button class="f-chip" data-cat="${s}">${SPECIALTY_ICONS[s]} ${s.replace('Perawat ','')}</button>`).join('')}
      </div>
      <div class="campaign-grid" id="camGrid">
        ${campaigns.map(c=>campaignCard(c)).join('') || emptyState('Belum ada campaign.')}
      </div>
      ${DB.getCurrentUser()?.role==='donor'?`<div style="text-align:center;margin-top:32px"><button class="btn btn-accent" onclick="openCreateCampaignModal()">+ Buat Campaign Baru</button></div>`:''}
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
    const list = DB.getCampaigns().filter(c=>{
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
function renderCampaignDetail(id){
  const c = DB.getCampaignById(id);
  if(!c){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Campaign tidak ditemukan.</p></div>'; return; }
  const p    = pct(c.current, c.target);
  const cls  = p>=100?'high':p>=80?'urgent':'';
  const doms = DB.getDonationsByCampaign(id).slice(-5).reverse();

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
            ? `<div style="display:flex;gap:20px;flex-wrap:wrap">
                 <div><span style="font-size:.76rem;color:var(--soft);display:block">Bank</span><strong>${esc(c.bankInfo.bankName)}</strong></div>
                 <div><span style="font-size:.76rem;color:var(--soft);display:block">No. Rekening</span><strong style="font-family:'Courier New',monospace">${esc(c.bankInfo.accountNumber)}</strong></div>
                 <div><span style="font-size:.76rem;color:var(--soft);display:block">Atas Nama</span><strong>${esc(c.bankInfo.accountName)}</strong></div>
               </div>
               ${c.bankInfo.verified?'<span class="bank-status verified" style="margin-top:8px;display:inline-flex">✓ Rekening terverifikasi</span>':'<span class="bank-status pending" style="margin-top:8px;display:inline-flex">⏳ Verifikasi rekening</span>'}`
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

        ${doms.length?`
        <div class="donors-list">
          <h4 style="font-family:var(--font-d);font-weight:700;font-size:.84rem;margin:0 0 10px">Donatur terakhir</h4>
          ${doms.map(d=>`
            <div class="donor-item">
              <span class="donor-name">${d.anonymous?'Anonim':esc(d.donorName)}</span>
              <span class="donor-amount">${rpFmt(d.amount)}</span>
            </div>`).join('')}
        </div>`:''}
      </div>
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
      <p class="lead">Kelola booking, donasi, dan profil Anda.</p>
      <div class="demo-box">
        <strong>Akun demo:</strong><br>
        pasien@test.com / test123 (Pasien)<br>
        perawat@test.com / test123 (Perawat)<br>
        donatur@test.com / test123 (Donatur)
      </div>
      <div class="ff"><label>Email</label><input type="email" id="loginEmail" placeholder="email@anda.com" /></div>
      <div class="ff"><label>Password</label><input type="password" id="loginPass" placeholder="••••••••" /></div>
      <div class="form-error" id="loginErr"></div>
      <button class="btn btn-primary btn-full" id="btnLogin" style="margin-top:12px">Masuk</button>
      <div style="text-align:center;margin-top:14px;font-size:.84rem;color:var(--soft)">
        Belum punya akun? <a href="#register">Daftar sekarang</a>
      </div>
    </div>
  </div>`;

  document.getElementById('btnLogin')?.addEventListener('click',()=>{
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPass')?.value;
    const err   = document.getElementById('loginErr');
    const u     = DB.getUserByEmail(email);
    if(!u || u.password !== pass){ err.textContent = 'Email atau password salah.'; return; }
    DB.setSession(u.id);
    toast('Selamat datang, '+u.name.split(' ')[0]+'!','s');
    navigate('#dashboard');
  });

  // Enter key
  document.addEventListener('keydown', function onEnter(e){
    if(e.key === 'Enter' && document.getElementById('loginEmail')){
      document.getElementById('btnLogin')?.click();
      document.removeEventListener('keydown', onEnter);
    }
  });
}

function renderRegister(){
  let selRole = 'patient';
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
        <div><label>No. HP</label><input type="tel" id="regPhone" placeholder="08xx…" /></div>
      </div>
      <div class="ff"><label>Password</label><input type="password" id="regPass" placeholder="Min. 6 karakter" /></div>

      <!-- Nurse extra -->
      <div id="nurseExtra" style="display:none">
        <div class="ff">
          <label>Spesialisasi</label>
          <select id="regSpecialty">
            ${SPECIALTIES.map(s=>`<option value="${s}">${SPECIALTY_ICONS[s]} ${s}</option>`).join('')}
          </select>
        </div>
        <div class="ff">
          <label>Pendidikan</label>
          <select id="regEducation">
            ${EDUCATION_LEVELS.map(e=>`<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div class="ff"><label>Kota domisili</label><input type="text" id="regLoc" placeholder="Bogor" /></div>
        <div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="regPrice" placeholder="150000" min="50000" /></div>
        <div class="ff"><label>Bio singkat</label><textarea id="regBio" rows="3" placeholder="Pengalaman, sertifikasi, keunggulan Anda…"></textarea></div>
      </div>

      <!-- Bank account -->
      <div style="background:var(--bg-alt);border-radius:var(--r-md);padding:16px;margin-bottom:14px">
        <h4 style="font-family:var(--font-d);font-weight:700;font-size:.88rem;margin:0 0 12px;color:var(--primary)">🏦 Rekening untuk pencairan dana</h4>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Wajib diisi agar donasi/pembayaran dapat dicairkan ke rekening Anda.</p>
        <div class="ff">
          <label>Nama bank</label>
          <select id="regBankName">
            <option value="">Pilih bank…</option>
            ${BANKS.map(b=>`<option value="${b}">${b}</option>`).join('')}
          </select>
        </div>
        <div class="ff row2">
          <div><label>Nomor rekening</label><input type="text" id="regAccNum" placeholder="1234567890" /></div>
          <div><label>Atas nama</label><input type="text" id="regAccName" placeholder="Nama di buku tabungan" /></div>
        </div>
      </div>

      <div class="form-error" id="regErr"></div>
      <button class="btn btn-primary btn-full" id="btnRegister">Daftar Sekarang</button>
      <div style="text-align:center;margin-top:12px;font-size:.82rem;color:var(--soft)">
        Sudah punya akun? <a href="#login">Masuk</a>
      </div>
      <div style="text-align:center;margin-top:10px;font-size:.74rem;color:var(--soft)">
        Dengan mendaftar, Anda menyetujui <a href="#tnc">Syarat &amp; Ketentuan</a> kami.
      </div>
    </div>
  </div>`;

  document.querySelectorAll('.role-pick').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.role-pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selRole = btn.dataset.role;
      document.getElementById('nurseExtra').style.display = selRole==='nurse'?'block':'none';
    });
  });

  document.getElementById('btnRegister')?.addEventListener('click',()=>{
    const err  = document.getElementById('regErr');
    const name = document.getElementById('regName')?.value.trim();
    const email= document.getElementById('regEmail')?.value.trim();
    const phone= document.getElementById('regPhone')?.value.trim();
    const pass = document.getElementById('regPass')?.value;
    const bank = document.getElementById('regBankName')?.value;
    const accN = document.getElementById('regAccNum')?.value.trim();
    const accA = document.getElementById('regAccName')?.value.trim();

    if(!name||!email||!phone||!pass){ err.textContent='Lengkapi semua field wajib.'; return; }
    if(pass.length < 6){ err.textContent='Password minimal 6 karakter.'; return; }
    if(DB.getUserByEmail(email)){ err.textContent='Email sudah terdaftar.'; return; }

    const userData = {
      name, email, phone, password: pass, role: selRole,
      bankInfo:{ bankName:bank||'', accountNumber:accN, accountName:accA, verified:false },
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

    const u = DB.addUser(userData);
    DB.setSession(u.id);
    toast('Akun berhasil dibuat! Selamat bergabung, '+name.split(' ')[0]+'.','s');
    navigate('#dashboard');
  });
}

// ── Dashboard ───────────────────────────────────────────────
function renderDashboard(){
  const u = DB.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  switch(u.role){
    case 'patient': renderPatientDash(u); break;
    case 'nurse':   renderNurseDash(u);   break;
    case 'donor':   renderDonorDash(u);   break;
  }
}

function sidebarHTML(u, activePage){
  const bankOk = u.bankInfo?.accountNumber;
  const links = {
    patient: [
      ['#dashboard','🏠','Dashboard'],['#perawat','🔍','Cari Perawat'],['#donasi','❤️','Donasi'],['#profil','👤','Profil & Rekening'],
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
      <div class="sb-bank">
        <span class="sb-bank-status ${bankOk?'ok':'warn'}">
          ${bankOk?'✓ Rekening terdaftar':'⚠ Rekening belum diisi'}
        </span>
      </div>
    </div>
    <nav class="sb-nav">
      ${(links[u.role]||[]).map(([href,icon,label])=>`
        <a href="${href}" class="${location.hash===href?'active':''}">
          <span>${icon}</span> ${label}
        </a>`).join('')}
    </nav>
    <div class="sb-footer">
      <button class="sb-logout" id="btnLogout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Keluar
      </button>
    </div>
  </div>`;
}

function afterDash(){ document.getElementById('btnLogout')?.addEventListener('click',()=>{ DB.clearSession(); toast('Berhasil keluar.'); navigate('#'); }); }

function renderPatientDash(u){
  const bookings = DB.getBookingsByPatient(u.id);
  const donations= DB.getDonationsByUser(u.id);
  const spent    = bookings.filter(b=>b.status==='completed').reduce((s,b)=>s+b.totalCost,0);

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Selamat datang, ${esc(u.name.split(' ')[0])}!</h2>
        <p>Kelola booking perawat dan riwayat donasi Anda.</p>
        ${!u.bankInfo?.accountNumber?`<div class="bank-warning" style="margin-top:10px;max-width:500px">⚠️ Lengkapi data rekening di <a href="#profil">halaman Profil</a> untuk kemudahan refund & konfirmasi.</div>`:''}
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
          <div><div class="stat-val">${rpFmt(spent)}</div><div class="stat-lbl">Total bayar booking</div></div>
        </div>
      </div>

      <!-- Bookings table -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Riwayat Booking Perawat</h3><a href="#perawat" class="btn btn-primary btn-sm">+ Booking Baru</a></div>
        ${bookings.length?`
        <div style="overflow-x:auto">
          <table class="tbl">
            <thead><tr><th>Perawat</th><th>Layanan</th><th>Tanggal</th><th>Durasi</th><th>Total Bayar</th><th>Platform Fee (20%)</th><th>Status</th></tr></thead>
            <tbody>
              ${bookings.map(b=>`
                <tr>
                  <td><strong>${esc(b.nurseName)}</strong><br><span style="font-size:.76rem;color:var(--soft)">${esc(b.nurseSpecialty)}</span></td>
                  <td>${esc(b.service)}</td>
                  <td>${esc(b.date)} ${esc(b.time)}</td>
                  <td>${b.duration} jam</td>
                  <td><strong>${rpFmt(b.totalCost)}</strong></td>
                  <td style="color:var(--accent2)">${rpFmt(b.platformFee||0)}</td>
                  <td><span class="status-badge s-${b.status}">${{pending:'Menunggu',confirmed:'Dikonfirmasi',completed:'Selesai',cancelled:'Dibatalkan'}[b.status]||b.status}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`:emptyState('Belum ada booking. <a href="#perawat">Cari perawat sekarang</a>.')}
      </div>

      <!-- Donations table -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Riwayat Donasi</h3><a href="#donasi" class="btn btn-outline btn-sm">Lihat Campaign</a></div>
        ${donations.length?`
        <div style="overflow-x:auto">
          <table class="tbl">
            <thead><tr><th>Campaign</th><th>Donasi</th><th>Biaya Layanan (5%)</th><th>Disalurkan</th><th>Tanggal</th></tr></thead>
            <tbody>
              ${donations.map(d=>{
                const cam = DB.getCampaignById(d.campaignId);
                return `<tr>
                  <td>${cam?`<a href="#donasi/${d.campaignId}">${esc(cam.title.slice(0,40))}…</a>`:'Campaign dihapus'}</td>
                  <td><strong>${rpFmt(d.amount)}</strong></td>
                  <td style="color:var(--accent2)">${rpFmt(d.platformFee||0)}</td>
                  <td style="color:var(--success)">${rpFmt(d.netAmount||d.amount)}</td>
                  <td>${esc(d.date)}</td>
                </tr>`;}).join('')}
            </tbody>
          </table>
        </div>`:emptyState('Belum ada donasi. <a href="#donasi">Donasi sekarang</a>.')}
      </div>
    </div>
  </div>`;
  afterDash();
}

function renderNurseDash(u){
  const bookings = DB.getBookingsByNurse(u.id);
  const earned   = bookings.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.nursePay||0),0);
  const p        = u.np || {};

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Dashboard Perawat</h2>
        <p>Kelola profil, jadwal, dan penghasilan Anda.</p>
        ${!u.bankInfo?.accountNumber?`<div class="bank-warning" style="margin-top:10px;max-width:500px">⚠️ <strong>Penting!</strong> Isi data rekening di <a href="#profil">Profil</a> agar penghasilan bisa dicairkan.</div>`:''}
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
        ${bookings.length?`
        <div style="overflow-x:auto">
          <table class="tbl">
            <thead><tr><th>Pasien</th><th>Layanan</th><th>Tanggal</th><th>Durasi</th><th>Total</th><th>Anda Terima (80%)</th><th>Fee Platform (20%)</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${bookings.map(b=>`
                <tr>
                  <td>${esc(b.nurseName||'Pasien')}</td>
                  <td>${esc(b.service)}</td>
                  <td>${esc(b.date)} ${esc(b.time)}</td>
                  <td>${b.duration}j</td>
                  <td>${rpFmt(b.totalCost)}</td>
                  <td style="color:var(--success);font-weight:700">${rpFmt(b.nursePay||0)}</td>
                  <td style="color:var(--accent2)">${rpFmt(b.platformFee||0)}</td>
                  <td><span class="status-badge s-${b.status}">${{pending:'Menunggu',confirmed:'Dikonfirmasi',completed:'Selesai',cancelled:'Dibatalkan'}[b.status]||b.status}</span></td>
                  <td>
                    ${b.status==='pending'?`
                      <button class="btn btn-xs btn-primary" onclick="updateBooking('${b.id}','confirmed')">Terima</button>
                      <button class="btn btn-xs btn-danger" style="margin-top:3px" onclick="updateBooking('${b.id}','cancelled')">Tolak</button>
                    `:b.status==='confirmed'?`<button class="btn btn-xs btn-outline" onclick="updateBooking('${b.id}','completed')">Selesai</button>`:'—'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`:emptyState('Belum ada booking masuk.')}
      </div>
    </div>
  </div>`;

  afterDash();
  document.getElementById('availToggle')?.addEventListener('change', function(){
    const np = {...(u.np||{}), avail: this.checked};
    DB.updateUser(u.id, {np});
    document.getElementById('availLabel').textContent = this.checked?'✅ Saya tersedia untuk booking':'⏸ Saya tidak tersedia';
    toast(this.checked?'Status tersedia diaktifkan.':'Status dinonaktifkan.','s');
  });
}

function renderDonorDash(u){
  const campaigns = DB.getCampaignsByUser(u.id);
  const donations = DB.getDonationsByUser(u.id);
  const totalDon  = donations.reduce((s,d)=>s+d.amount,0);

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
        ${campaigns.length?`
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
          ${campaigns.map(c=>{
            const p=pct(c.current,c.target);
            return `<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:16px">
              <div style="font-weight:700;font-size:.9rem;margin-bottom:6px;color:var(--primary)">${esc(c.title.slice(0,45))}…</div>
              <div class="progress-bar" style="margin-bottom:5px"><div class="progress-fill" style="width:${p}%"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:8px">
                <span>${rpFmt(c.current)} / ${rpFmt(c.target)}</span>
                <span>${p}%</span>
              </div>
              <!-- Bank info for campaign -->
              <div style="font-size:.76rem;color:var(--soft);margin-bottom:10px">
                🏦 ${c.bankInfo?.accountNumber
                  ? `${c.bankInfo.bankName} · ${c.bankInfo.accountNumber}`
                  : '<span style="color:var(--danger)">Rekening belum diisi</span>'}
              </div>
              <div style="display:flex;gap:6px">
                <a href="#donasi/${c.id}" class="btn btn-xs btn-outline">Lihat</a>
                <button class="btn btn-xs btn-primary" onclick="openEditCampaignModal('${c.id}')">Edit Rekening</button>
              </div>
            </div>`;}).join('')}
        </div>`:emptyState('Belum ada campaign. Buat campaign pertama Anda!')}
      </div>
    </div>
  </div>`;
  afterDash();
}

// ── Profile ─────────────────────────────────────────────────
function renderProfile(){
  const u = DB.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  const bank = u.bankInfo || {};
  const np   = u.np || {};

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>Profil & Rekening</h2>
        <p>Kelola informasi pribadi dan data rekening pencairan.</p>
      </div>

      <!-- Profile info -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Informasi Pribadi</h3></div>
        <div class="profile-grid">
          <div class="ff"><label>Nama lengkap</label><input type="text" id="profName" value="${esc(u.name)}" /></div>
          <div class="ff"><label>No. HP</label><input type="tel" id="profPhone" value="${esc(u.phone||'')}" /></div>
          <div class="ff full"><label>Email</label><input type="email" id="profEmail" value="${esc(u.email)}" readonly style="opacity:.6" /></div>
          ${u.role==='patient'?`<div class="ff full"><label>Alamat</label><input type="text" id="profAddr" value="${esc(u.address||'')}" /></div>`:''}
          ${u.role==='donor'?`<div class="ff full"><label>Organisasi / Instansi</label><input type="text" id="profOrg" value="${esc(u.organization||'')}" /></div>`:''}
        </div>
        <button class="btn btn-primary btn-sm" id="btnSaveProfile" style="margin-top:4px">Simpan Profil</button>
      </div>

      <!-- Nurse profile extra -->
      ${u.role==='nurse'?`
      <div class="dash-section">
        <div class="dash-sh"><h3>Profil Perawat</h3></div>
        <div class="profile-grid">
          <div class="ff"><label>Spesialisasi</label>
            <select id="npSpec">
              ${SPECIALTIES.map(s=>`<option value="${s}" ${np.specialty===s?'selected':''}>${SPECIALTY_ICONS[s]} ${s}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Pendidikan</label>
            <select id="npEdu">
              ${EDUCATION_LEVELS.map(e=>`<option value="${e}" ${np.education===e?'selected':''}>${e}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Kota</label><input type="text" id="npLoc" value="${esc(np.loc||'')}" /></div>
          <div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="npPrice" value="${np.price||0}" /></div>
          <div class="ff full"><label>Bio</label><textarea id="npBio" rows="3">${esc(np.bio||'')}</textarea></div>
          <div class="ff">
            <label>Jadwal tersedia</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=>`
                <label style="display:flex;align-items:center;gap:5px;font-size:.82rem;cursor:pointer;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;background:${(np.schedule||[]).includes(d)?'var(--primary)':'var(--bg)'};color:${(np.schedule||[]).includes(d)?'#fff':'var(--ink)'}">
                  <input type="checkbox" ${(np.schedule||[]).includes(d)?'checked':''} value="${d}" style="display:none" onchange="this.parentElement.style.background=this.checked?'var(--primary)':'var(--bg)';this.parentElement.style.color=this.checked?'#fff':'var(--ink)'">
                  ${d.slice(0,3)}
                </label>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="btnSaveNP" style="margin-top:4px">Simpan Profil Perawat</button>
      </div>`:''}

      <!-- Bank account -->
      <div class="dash-section">
        <div class="dash-sh">
          <h3>🏦 Rekening Pencairan Dana</h3>
          ${bank.accountNumber
            ?`<span class="bank-status ${bank.verified?'verified':'pending'}">${bank.verified?'✓ Terverifikasi':'⏳ Menunggu verifikasi'}</span>`
            :`<span class="bank-status empty">❌ Belum diisi</span>`}
        </div>

        <div class="bank-warning">
          ⚠️ <strong>Wajib diisi:</strong> Data rekening diperlukan untuk pencairan pembayaran booking (perawat) dan donasi (donatur/campaign). Pastikan nama rekening sesuai dengan nama pemilik akun.
        </div>

        ${bank.accountNumber?`
        <div style="background:var(--bg-alt);border-radius:var(--r-md);padding:18px;margin:14px 0">
          <div class="bank-display">
            <span class="bank-display-name">${esc(bank.bankName)}</span>
            <span class="bank-display-num">${esc(bank.accountNumber)}</span>
            <span class="bank-display-owner">a.n. ${esc(bank.accountName)}</span>
          </div>
        </div>`:''}

        <div class="profile-grid" style="margin-top:14px">
          <div class="ff full"><label>Nama Bank</label>
            <select id="bankNameInput">
              <option value="">Pilih bank…</option>
              ${BANKS.map(b=>`<option value="${b}" ${bank.bankName===b?'selected':''}>${b}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Nomor Rekening</label><input type="text" id="bankAccNum" value="${esc(bank.accountNumber||'')}" placeholder="Nomor rekening" /></div>
          <div class="ff"><label>Nama Pemilik Rekening</label><input type="text" id="bankAccName" value="${esc(bank.accountName||'')}" placeholder="Sesuai buku tabungan" /></div>
        </div>
        <p style="font-size:.78rem;color:var(--soft);margin:6px 0 12px">Verifikasi rekening dilakukan oleh tim Akemat dalam 1×24 jam kerja.</p>
        <button class="btn btn-primary btn-sm" id="btnSaveBank">Simpan Data Rekening</button>
      </div>
    </div>
  </div>`;

  afterDash();

  document.getElementById('btnSaveProfile')?.addEventListener('click',()=>{
    const name  = document.getElementById('profName')?.value.trim();
    const phone = document.getElementById('profPhone')?.value.trim();
    if(!name){ toast('Nama wajib diisi.','e'); return; }
    const upd = { name, phone };
    if(u.role==='patient') upd.address = document.getElementById('profAddr')?.value.trim();
    if(u.role==='donor')   upd.organization = document.getElementById('profOrg')?.value.trim();
    DB.updateUser(u.id, upd);
    toast('Profil berhasil disimpan.','s');
  });

  document.getElementById('btnSaveNP')?.addEventListener('click',()=>{
    const schedule = [...document.querySelectorAll('[value] input[type=checkbox]:checked')].map(cb=>cb.value);
    const spec     = document.getElementById('npSpec')?.value;
    DB.updateUser(u.id, {np:{
      ...u.np,
      specialty:  spec,
      education:  document.getElementById('npEdu')?.value,
      loc:        document.getElementById('npLoc')?.value.trim(),
      price:      parseInt(document.getElementById('npPrice')?.value)||u.np?.price,
      bio:        document.getElementById('npBio')?.value.trim(),
      schedule,
      services:   BOOKING_SERVICES[spec] || u.np?.services,
    }});
    toast('Profil perawat berhasil disimpan.','s');
  });

  document.getElementById('btnSaveBank')?.addEventListener('click',()=>{
    const bankName = document.getElementById('bankNameInput')?.value;
    const accNum   = document.getElementById('bankAccNum')?.value.trim();
    const accName  = document.getElementById('bankAccName')?.value.trim();
    if(!bankName||!accNum||!accName){ toast('Lengkapi semua data rekening.','e'); return; }
    DB.updateUser(u.id, { bankInfo:{ bankName, accountNumber:accNum, accountName:accName, verified:false }});
    toast('Data rekening disimpan. Verifikasi dalam 1×24 jam kerja.','s');
    setTimeout(()=>renderProfile(), 800);
  });
}

// ── Modals ──────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; }

function openDonateModal(campaignId){
  const u   = DB.getCurrentUser();
  const cam = DB.getCampaignById(campaignId);
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

  document.getElementById('btnSubmitDonation').onclick=()=>{
    const amt   = selAmt||parseInt(document.getElementById('donCustomAmt')?.value)||0;
    const name  = document.getElementById('donBuyerName')?.value.trim();
    const email = document.getElementById('donBuyerEmail')?.value.trim();
    const phone = document.getElementById('donBuyerPhone')?.value.trim();
    const anon  = document.getElementById('donAnon')?.checked;
    const cid   = document.getElementById('donCamId')?.value;
    if(amt<1000){ toast('Minimal donasi Rp 1.000.','e'); return; }
    if(!name||!email){ toast('Nama dan email wajib diisi.','e'); return; }
    DB.addDonation({ campaignId:cid, donorId:u?.id||'guest', donorName:name, amount:amt, anonymous:anon });
    closeModal('modalDonate');
    toast('Terima kasih! Donasi Rp '+amt.toLocaleString('id-ID')+' berhasil dicatat.','s');
    // re-render page jika di detail campaign
    if(location.hash.startsWith('#donasi/')) renderCampaignDetail(cid);
  };
}

function openBookingModal(nurseId){
  const u = DB.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
  if(u.role!=='patient'){ toast('Hanya pasien yang bisa memesan perawat.','e'); return; }
  navigate('#perawat/'+nurseId);
}

function openCreateCampaignModal(){
  const u = DB.getCurrentUser();
  if(!u||u.role!=='donor'){ toast('Hanya donatur yang bisa membuat campaign.','e'); return; }
  openModal('modalCreateCampaign');
  document.getElementById('btnCreateCampaign').onclick=()=>{
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
    DB.addCampaign({
      title, story, target, deadline, category,
      createdBy: u.id, creatorName: u.name,
      verified: false,
      bankInfo: { bankName, accountNumber:accNum, accountName:accOwner, verified:false },
    });
    closeModal('modalCreateCampaign');
    toast('Campaign berhasil dibuat!','s');
    renderDonorDash(DB.getCurrentUser());
  };
}

function openEditCampaignModal(campaignId){
  const cam = DB.getCampaignById(campaignId);
  if(!cam) return;
  const bank = cam.bankInfo||{};
  document.getElementById('ecCamId').value    = campaignId;
  document.getElementById('ecBankName').value = bank.bankName||'';
  document.getElementById('ecAccNum').value   = bank.accountNumber||'';
  document.getElementById('ecAccOwner').value = bank.accountName||'';
  openModal('modalEditCampaign');
  document.getElementById('btnSaveEditCampaign').onclick=()=>{
    const cid     = document.getElementById('ecCamId')?.value;
    const bankName= document.getElementById('ecBankName')?.value;
    const accNum  = document.getElementById('ecAccNum')?.value.trim();
    const accOwner= document.getElementById('ecAccOwner')?.value.trim();
    if(!bankName||!accNum||!accOwner){ toast('Lengkapi semua data rekening.','e'); return; }
    DB.updateCampaign(cid, { bankInfo:{ bankName, accountNumber:accNum, accountName:accOwner, verified:false }});
    closeModal('modalEditCampaign');
    toast('Data rekening campaign disimpan.','s');
    renderDonorDash(DB.getCurrentUser());
  };
}

// Global helpers
window.openDonateModal        = openDonateModal;
window.openBookingModal       = openBookingModal;
window.openCreateCampaignModal= openCreateCampaignModal;
window.openEditCampaignModal  = openEditCampaignModal;
window.updateBooking = (id, status)=>{
  DB.updateBooking(id, {status});
  toast({confirmed:'Booking dikonfirmasi!',cancelled:'Booking ditolak.',completed:'Booking selesai!'}[status]||'Updated','s');
  renderDashboard();
};

// ── TNC ────────────────────────────────────────────────────
function renderTNC(){
  app.innerHTML = `
  <div class="tnc-faq-page">
    <p class="eyebrow">Dokumen legal</p>
    <h1>Syarat &amp; Ketentuan</h1>
    <p class="lead">Terakhir diperbarui: 1 Juli 2025. Dengan menggunakan platform Akemat Foundation, Anda menyetujui seluruh ketentuan di bawah ini.</p>

    <div class="tnc-section">
      <h2>1. Tentang Platform</h2>
      <p>Akemat Foundation adalah platform digital berbasis yayasan yang mempertemukan pasien/keluarga yang membutuhkan layanan perawatan di rumah (<em>home care</em>) dengan tenaga perawat profesional terlatih. Platform ini juga menyediakan fitur kampanye donasi untuk membantu pembiayaan layanan perawatan bagi mereka yang membutuhkan.</p>
    </div>

    <div class="tnc-section">
      <h2>2. Akun Pengguna</h2>
      <h3>2.1 Pendaftaran</h3>
      <ul>
        <li>Pengguna wajib mendaftar dengan identitas asli dan data yang benar.</li>
        <li>Setiap pengguna hanya diperbolehkan memiliki satu akun aktif.</li>
        <li>Akemat Foundation berhak menonaktifkan akun yang terindikasi melanggar ketentuan.</li>
      </ul>
      <h3>2.2 Keamanan Akun</h3>
      <ul>
        <li>Pengguna bertanggung jawab penuh atas kerahasiaan kata sandi dan keamanan akun.</li>
        <li>Segera laporkan ke kami jika terdapat akses tidak sah ke akun Anda.</li>
      </ul>
    </div>

    <div class="tnc-section">
      <h2>3. Layanan Perawat (Home Care)</h2>
      <h3>3.1 Booking &amp; Pembayaran</h3>
      <ul>
        <li>Pasien memesan perawat melalui platform dan melakukan pembayaran sesuai tarif yang tertera.</li>
        <li><strong>Struktur biaya booking:</strong> 80% diterima perawat; 20% adalah biaya platform Akemat Foundation.</li>
        <li>Biaya platform digunakan untuk operasional, verifikasi perawat, pengembangan aplikasi, dan layanan pelanggan.</li>
        <li>Tarif per jam ditetapkan oleh perawat dan ditampilkan secara transparan di profil masing-masing.</li>
      </ul>
      <h3>3.2 Verifikasi Perawat</h3>
      <ul>
        <li>Perawat yang bergabung wajib menyerahkan dokumen identitas, ijazah keperawatan, dan STR (Surat Tanda Registrasi) untuk proses verifikasi.</li>
        <li>Perawat yang belum terverifikasi ditandai secara jelas di platform.</li>
        <li>Akemat Foundation tidak bertanggung jawab atas tindakan perawat yang belum terverifikasi.</li>
      </ul>
      <h3>3.3 Pembatalan &amp; Refund</h3>
      <ul>
        <li>Pembatalan oleh pasien minimal 24 jam sebelum jadwal: refund 100%.</li>
        <li>Pembatalan kurang dari 24 jam: dikenakan biaya admin 10% dari total booking.</li>
        <li>Pembatalan sepihak oleh perawat tanpa alasan valid: refund 100% ke pasien.</li>
        <li>Proses refund dilakukan dalam 3–5 hari kerja ke rekening yang terdaftar.</li>
      </ul>
      <h3>3.4 Rekening Perawat</h3>
      <ul>
        <li>Perawat wajib mengisi data rekening bank yang valid untuk pencairan penghasilan.</li>
        <li>Pencairan dilakukan setiap minggu untuk booking yang berstatus <em>selesai</em>.</li>
        <li>Verifikasi rekening dilakukan oleh tim Akemat dalam 1×24 jam kerja.</li>
      </ul>
    </div>

    <div class="tnc-section">
      <h2>4. Kampanye Donasi</h2>
      <h3>4.1 Pembuatan Campaign</h3>
      <ul>
        <li>Donatur yang terverifikasi dapat membuat kampanye donasi untuk membantu pembiayaan layanan perawatan.</li>
        <li>Setiap kampanye wajib menyertakan cerita autentik, target dana, dan tenggat waktu yang realistis.</li>
        <li>Akemat Foundation berhak menolak atau menghapus kampanye yang tidak sesuai ketentuan atau terindikasi penipuan.</li>
      </ul>
      <h3>4.2 Biaya Layanan Donasi</h3>
      <ul>
        <li><strong>Dari setiap donasi yang masuk: 95% disalurkan ke kampanye; 5% adalah biaya layanan platform.</strong></li>
        <li>Biaya layanan ini mencakup: verifikasi kampanye, operasional sistem pembayaran, dukungan teknis, dan akuntabilitas donasi.</li>
        <li>Rincian biaya ini ditampilkan secara transparan di setiap halaman kampanye sebelum konfirmasi donasi.</li>
      </ul>
      <h3>4.3 Rekening Penerima Campaign</h3>
      <ul>
        <li>Pemilik kampanye wajib mendaftarkan rekening bank yang valid sebagai tujuan pencairan donasi.</li>
        <li>Pencairan donasi dilakukan setelah kampanye berakhir atau mencapai target, setelah melalui proses verifikasi.</li>
        <li>Akemat Foundation tidak bertanggung jawab atas rekening yang didaftarkan dengan data tidak valid.</li>
      </ul>
      <h3>4.4 Tanggung Jawab Donatur</h3>
      <ul>
        <li>Donasi yang sudah dikirim tidak dapat ditarik kembali kecuali kampanye dibatalkan oleh Akemat Foundation.</li>
        <li>Donatur bertanggung jawab untuk memverifikasi keabsahan kampanye sebelum berdonasi.</li>
      </ul>
    </div>

    <div class="tnc-section">
      <h2>5. Privasi Data</h2>
      <ul>
        <li>Data pribadi pengguna (nama, kontak, rekening) hanya digunakan untuk keperluan layanan platform.</li>
        <li>Akemat Foundation tidak menjual atau membagikan data pengguna kepada pihak ketiga untuk tujuan komersial.</li>
        <li>Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan yang berwenang.</li>
        <li>Pengguna dapat meminta penghapusan data dengan menghubungi tim kami melalui email resmi.</li>
      </ul>
    </div>

    <div class="tnc-section">
      <h2>6. Larangan Penggunaan</h2>
      <p>Pengguna dilarang keras untuk:</p>
      <ul>
        <li>Membuat kampanye donasi palsu atau menyesatkan.</li>
        <li>Mendaftarkan identitas atau data rekening palsu.</li>
        <li>Menggunakan platform untuk tujuan yang melanggar hukum Indonesia.</li>
        <li>Meminta pembayaran di luar platform kepada perawat atau pasien.</li>
        <li>Membuat beberapa akun dengan tujuan manipulasi sistem.</li>
      </ul>
    </div>

    <div class="tnc-section">
      <h2>7. Perubahan Ketentuan</h2>
      <p>Akemat Foundation berhak mengubah Syarat &amp; Ketentuan ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui email terdaftar dan notifikasi platform minimal 7 hari sebelum berlaku.</p>
    </div>

    <div class="tnc-section">
      <h2>8. Kontak &amp; Penyelesaian Sengketa</h2>
      <p>Untuk pertanyaan atau pengaduan terkait Syarat &amp; Ketentuan ini, hubungi kami di:</p>
      <ul>
        <li>Email: customecare@akematfoundation.org</li>
        <li>WhatsApp: +62 851-9640-7117</li>
        <li>Alamat: Jl. Contoh Raya No. 123, Bogor, Jawa Barat</li>
      </ul>
      <p>Sengketa yang tidak dapat diselesaikan secara musyawarah akan diselesaikan melalui Badan Arbitrase Nasional Indonesia (BANI) sesuai peraturan yang berlaku.</p>
    </div>

    <div style="margin-top:36px;text-align:center">
      <a href="#" class="btn btn-primary">Kembali ke Beranda</a>
      <a href="#faq" class="btn btn-outline" style="margin-left:10px">Lihat FAQ →</a>
    </div>
  </div>
  ${renderFooterSection()}`;
}

// ── FAQ ────────────────────────────────────────────────────
function renderFAQ(){
  const faqs = [
    { q:'Apa itu Akemat Foundation?',
      a:'Akemat Foundation adalah yayasan kemanusiaan yang mempertemukan pasien/keluarga dengan perawat profesional untuk layanan home care (perawatan di rumah). Kami juga menyediakan platform donasi untuk membantu pembiayaan perawatan bagi yang membutuhkan.' },
    { q:'Bagaimana cara memesan perawat?',
      a:'Mudah! (1) Daftar atau login sebagai pasien. (2) Klik "Cari Perawat" dan filter berdasarkan spesialisasi, kota, dan ketersediaan. (3) Pilih perawat yang sesuai dan klik "Pesan". (4) Isi detail tanggal, waktu, durasi, dan alamat. (5) Konfirmasi booking — perawat akan menghubungi Anda via WhatsApp untuk konfirmasi.'},
    { q:'Berapa biaya platform untuk booking perawat?',
      a:'Platform Akemat mengambil 20% dari total nilai booking. Artinya, jika Anda membayar Rp 300.000, perawat menerima Rp 240.000 (80%) dan Rp 60.000 (20%) masuk ke operasional platform. Rincian ini selalu ditampilkan transparan sebelum Anda konfirmasi booking.',
      highlight:'Pasien bayar: 100% → Perawat terima: 80% → Platform: 20%' },
    { q:'Berapa biaya layanan untuk donasi?',
      a:'Dari setiap donasi yang masuk, 95% langsung disalurkan ke campaign dan 5% adalah biaya layanan platform. Biaya ini mencakup verifikasi campaign, sistem pembayaran, dan operasional. Rincian ini selalu ditampilkan sebelum Anda konfirmasi donasi.',
      highlight:'Donasi Anda: 100% → Campaign terima: 95% → Platform: 5%' },
    { q:'Apakah perawat di Akemat sudah terverifikasi?',
      a:'Perawat dengan lencana "✓ Terverifikasi" telah melalui proses verifikasi dokumen identitas, ijazah keperawatan, dan STR (Surat Tanda Registrasi). Perawat yang belum terverifikasi diberi label jelas. Kami menyarankan untuk memilih perawat yang sudah terverifikasi untuk keamanan maksimal.'},
    { q:'Apa saja spesialisasi perawat yang tersedia?',
      a:'Akemat memiliki 7 spesialisasi perawat: (1) Perawat Jiwa – gangguan mental, skizofrenia, depresi; (2) Perawat Anak & Bayi – neonatus, tumbuh kembang, ABK; (3) Perawat Lansia – gerontologi, demensia; (4) Perawat Medical Bedah – pasca operasi, infus, kateter; (5) Perawat Luka – luka diabetik, stoma, pressure ulcer; (6) Perawat Maternitas – pasca melahirkan, laktasi; (7) Perawat Paliatif – kanker terminal, manajemen nyeri.'},
    { q:'Apa saja jenjang pendidikan perawat di platform ini?',
      a:'Akemat menerima perawat dengan latar belakang: D3 Keperawatan, D4 Keperawatan, Ners/Profesi Ners (S1+Profesi), dan Spesialis Keperawatan. Jenjang pendidikan ditampilkan transparan di profil setiap perawat.'},
    { q:'Bagaimana cara berdonasi?',
      a:'(1) Kunjungi halaman Donasi. (2) Pilih campaign yang ingin Anda dukung. (3) Klik "Donasi". (4) Pilih nominal atau masukkan jumlah sendiri. (5) Isi nama, email, dan nomor HP. (6) Konfirmasi donasi — dana akan langsung tercatat dan disalurkan ke campaign.'},
    { q:'Kapan donasi saya dicairkan ke penerima?',
      a:'Pencairan donasi dilakukan setelah kampanye berakhir atau mencapai target dana, setelah melalui proses verifikasi oleh tim Akemat. Pemilik campaign wajib mengisi data rekening bank yang valid di profil mereka. Proses transfer 3–7 hari kerja.'},
    { q:'Bagaimana cara membuat campaign donasi?',
      a:'Daftar sebagai Donatur, lengkapi profil termasuk data rekening bank, lalu klik "+ Buat Campaign" di dashboard. Isi judul, cerita, target dana, deadline, dan kategori. Campaign akan melalui proses review oleh tim Akemat (1–2 hari kerja) sebelum tayang.'},
    { q:'Bagaimana jika perawat tidak datang sesuai jadwal?',
      a:'Segera hubungi tim Akemat via WhatsApp. Jika perawat membatalkan sepihak tanpa alasan valid, Anda akan mendapat refund 100%. Kami juga akan membantu mencarikan perawat pengganti secepat mungkin.'},
    { q:'Apa itu rekening pencairan dan mengapa wajib diisi?',
      a:'Rekening pencairan adalah rekening bank Anda yang digunakan oleh Akemat untuk mentransfer penghasilan (bagi perawat) atau donasi (bagi pemilik campaign). Tanpa data rekening yang valid, pembayaran tidak dapat diproses. Verifikasi rekening dilakukan dalam 1×24 jam kerja oleh tim kami.'},
    { q:'Apakah data rekening saya aman?',
      a:'Ya. Data rekening disimpan secara terenkripsi dan hanya dapat diakses oleh tim keuangan Akemat yang berwenang. Kami tidak pernah membagikan data rekening kepada pihak ketiga. Jika Anda curiga ada aktivitas mencurigakan, segera hubungi kami.'},
    { q:'Bagaimana cara daftar sebagai perawat mitra?',
      a:'Klik "Daftar" dan pilih peran "Perawat". Lengkapi data: nama, kontak, spesialisasi, pendidikan, kota, tarif per jam, bio, dan jadwal ketersediaan. Tambahkan data rekening untuk pencairan. Tim kami akan melakukan verifikasi dokumen (ijazah, STR) dalam 2–3 hari kerja.'},
    { q:'Berapa perawat menerima dari setiap booking?',
      a:'Perawat menerima 80% dari total nilai booking. Misalnya: tarif Rp 150.000/jam × 3 jam = Rp 450.000 total. Perawat menerima Rp 360.000 (80%) dan platform mengambil Rp 90.000 (20%). Penghasilan dicairkan setiap minggu.',
      highlight:'Penghasilan Anda = tarif per jam × durasi × 80%'},
    { q:'Apakah ada garansi keamanan bertransaksi?',
      a:'Ya. Semua pembayaran booking diproses melalui iPaymu (payment gateway berlisensi Bank Indonesia). Data transaksi dienkripsi dengan standar industri. Anda akan menerima bukti transaksi via email setiap kali melakukan pembayaran atau donasi.'},
  ];

  app.innerHTML = `
  <div class="tnc-faq-page">
    <p class="eyebrow">Pertanyaan umum</p>
    <h1>FAQ — Pertanyaan yang Sering Ditanyakan</h1>
    <p class="lead">Temukan jawaban atas pertanyaan umum seputar Akemat Foundation. Tidak menemukan jawaban yang Anda cari? <a href="#">Hubungi kami</a>.</p>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
      ${['Semua','Booking Perawat','Donasi','Rekening','Akun'].map((cat,i)=>`
        <button class="f-chip${i===0?' active':''}" data-faq-cat="${cat}">${cat}</button>`).join('')}
    </div>

    <div id="faqList">
      ${faqs.map((f,i)=>`
        <div class="faq-item">
          <button class="faq-q" data-faq="${i}">
            ${esc(f.q)}
            <span class="faq-icon">+</span>
          </button>
          <div class="faq-a" id="faq-a-${i}">
            ${esc(f.a)}
            ${f.highlight?`<div class="faq-highlight">💡 <strong>${esc(f.highlight)}</strong></div>`:''}
          </div>
        </div>`).join('')}
    </div>

    <div style="background:var(--bg-alt);border-radius:var(--r-md);padding:24px;margin-top:32px;text-align:center">
      <h3 style="margin-bottom:8px">Masih ada pertanyaan?</h3>
      <p style="margin-bottom:16px">Tim kami siap membantu Anda setiap hari Senin–Sabtu, 08.00–17.00 WIB.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <a href="https://wa.me/6285196407117" target="_blank" class="btn btn-primary">WhatsApp Kami</a>
        <a href="mailto:customecare@akematfoundation.org" class="btn btn-outline">Email Kami</a>
        <a href="#tnc" class="btn btn-ghost">Syarat &amp; Ketentuan</a>
      </div>
    </div>
  </div>
  ${renderFooterSection()}`;

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx  = btn.dataset.faq;
      const ans  = document.getElementById('faq-a-'+idx);
      const open = btn.classList.toggle('open');
      ans.classList.toggle('open', open);
    });
  });
}

// ── Footer (inline) ─────────────────────────────────────────
function renderFooterSection(){
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="#" class="logo">
          <svg class="logo-mark" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#F2A541"/><path d="M24 36c-7-5.5-13-10.8-13-17A8 8 0 0 1 24 13a8 8 0 0 1 13 6c0 6.2-6 11.5-13 17z" fill="#FBF7F1"/></svg>
          <span>Akemat <strong>Foundation</strong></span>
        </a>
        <p>Menghadirkan perawat tepercaya bagi keluarga yang membutuhkan, didukung oleh donasi masyarakat.</p>
        <div class="social-links">
          <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 8h2V5h-2a4 4 0 0 0-4 4v2H9v3h2v6h3v-6h2.2l.8-3H14V9c0-.6.4-1 1-1z"/></svg></a>
        </div>
      </div>
      <nav class="f-nav">
        <h4>Platform</h4>
        <ul>
          <li><a href="#perawat">Cari Perawat</a></li>
          <li><a href="#donasi">Kampanye Donasi</a></li>
          <li><a href="#register">Daftar Perawat</a></li>
          <li><a href="#dashboard">Dashboard</a></li>
        </ul>
      </nav>
      <div class="f-cta">
        <h4>Informasi</h4>
        <ul class="f-nav" style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px">
          <li><a href="#faq" style="color:#C5D8CD;font-size:.84rem">FAQ</a></li>
          <li><a href="#tnc" style="color:#C5D8CD;font-size:.84rem">Syarat &amp; Ketentuan</a></li>
          <li><a href="mailto:customecare@akematfoundation.org" style="color:#C5D8CD;font-size:.84rem">customecare@akematfoundation.org</a></li>
          <li><a href="https://wa.me/6285196407117" style="color:#C5D8CD;font-size:.84rem">WhatsApp</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${new Date().getFullYear()} Akemat Foundation. Semua hak cipta dilindungi.</p>
      <p><a href="#tnc" style="color:#90A89E">Syarat &amp; Ketentuan</a> · <a href="#faq" style="color:#90A89E">FAQ</a></p>
    </div>
  </footer>`;
}

function emptyState(msg){
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  DB.seed();
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

  // Modal close buttons & overlay click
  document.addEventListener('click',e=>{
    if(e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
    if(e.target.classList.contains('modal-x')) closeModal(e.target.closest('.modal-overlay')?.id);
  });
});
