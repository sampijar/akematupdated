'use strict';
// =========================================================
// Akemat Foundation — Halaman Daftar & Detail Campaign Donasi
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — bukan bagian dari initial load beranda.
// Memakai helper global dari app.js (app, Store, skeletonGrid, campaignCard,
// emptyState, renderFooterSection, pct, specBadge, ICON, esc, rpFmt,
// daysLeft, toast — openDonateModal dipanggil lewat window.openDonateModal
// dari onclick inline).
// =========================================================

// ── Campaign List ───────────────────────────────────────────
export async function renderCampaignList(){
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

// ── Campaign Detail ─────────────────────────────────────────
export async function renderCampaignDetail(id){
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
