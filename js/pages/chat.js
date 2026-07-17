'use strict';
// =========================================================
// Akemat Foundation — Chat pasien-perawat (per janji temu)
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — cuma dibuka setelah pembayaran janji temu lunas,
// jauh dari initial load.
// Memakai helper global dari app.js (app, esc, Store, navigate, toast, ICON).
// _chatPollTimer adalah variabel top-level `let` di app.js — modul ini
// membaca & menimpanya langsung (dikonfirmasi berfungsi lintas modul via
// dynamic import di realm yang sama), supaya route() tetap bisa
// menghentikan polling saat pengguna pindah halaman.
// =========================================================

function chatBlockedPage(icon, title, msg){
  app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
    '<div style="font-size:2.5rem;margin-bottom:10px">'+icon+'</div>'+
    '<h2>'+esc(title)+'</h2>'+
    '<p style="color:var(--soft);margin:8px 0 20px">'+esc(msg)+'</p>'+
    '<a href="#dashboard" class="btn btn-primary">Kembali ke Dashboard</a></div>';
}
export async function renderChat(bookingId){
  const u = Store.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  if(Store.backend !== 'remote'){
    chatBlockedPage('💬','Chat Belum Tersedia','Fitur chat cuma didukung saat aplikasi terhubung ke server (bukan mode lokal).');
    return;
  }
  const booking = await Store.getBookingById(bookingId);
  if(!booking || (booking.patientId !== u.id && booking.nurseId !== u.id)){
    chatBlockedPage('🔒','Chat Tidak Ditemukan','Janji temu ini tidak ditemukan atau bukan milik Anda.');
    return;
  }
  if(booking.paymentStatus !== 'paid'){
    chatBlockedPage('⏳','Chat Belum Dibuka','Chat baru bisa dipakai setelah pembayaran janji temu ini dikonfirmasi.');
    return;
  }
  const otherName = u.id === booking.patientId ? (booking.nurseName||'Perawat') : (booking.patientProfileName||'Pasien');

  app.innerHTML = `
  <div class="chat-page">
    <div class="chat-header">
      <a href="#dashboard" class="chat-back" aria-label="Kembali ke Dashboard">${ICON.chevronLeft}</a>
      <div class="chat-header-info">
        <div class="chat-title">${esc(otherName)}</div>
        <div class="chat-sub">${esc(booking.service)} · ${esc(booking.date)}</div>
      </div>
    </div>
    <div class="chat-warning">⚠️ Dilarang membagikan nomor HP/email/kontak lain di sini — semua janji temu &amp; pembayaran wajib lewat Akemat Foundation.</div>
    <div class="chat-messages" id="chatMessages"><p style="text-align:center;color:var(--soft);font-size:.84rem;padding:20px 0">Memuat pesan…</p></div>
    <div class="chat-input-row">
      <input type="text" id="chatInput" placeholder="Tulis pesan…" maxlength="1000" autocomplete="off" />
      <button class="btn btn-primary" id="chatSend">Kirim</button>
    </div>
  </div>`;

  function bubble(m){
    const mine = m.senderId === u.id;
    return '<div class="chat-bubble-row'+(mine?' mine':'')+'"><div class="chat-bubble">'+esc(m.body)+'</div></div>';
  }
  let lastCount = -1;
  async function loadMessages(){
    let msgs;
    try { msgs = await Store.getMessages(bookingId); }
    catch { return; } // gagal diam-diam, dicoba lagi di polling berikutnya
    const wrap = document.getElementById('chatMessages');
    if(!wrap) return; // pengguna sudah pindah halaman (polling lama belum sempat berhenti)
    if(msgs.length === lastCount) return; // tidak ada pesan baru — jangan re-render, jaga posisi scroll
    lastCount = msgs.length;
    wrap.innerHTML = msgs.length ? msgs.map(bubble).join('') : '<p style="text-align:center;color:var(--soft);font-size:.84rem;padding:20px 0">Belum ada pesan. Mulai percakapan di sini.</p>';
    wrap.scrollTop = wrap.scrollHeight;
  }
  await loadMessages();
  _chatPollTimer = setInterval(loadMessages, 6000);

  async function send(){
    const input = document.getElementById('chatInput');
    const body = input.value.trim();
    if(!body) return;
    const btn = document.getElementById('chatSend');
    if(btn.disabled) return;
    btn.disabled = true;
    try {
      await Store.sendMessage(bookingId, body);
      input.value = '';
      lastCount = -1; // paksa re-render walau jumlah kebetulan masih sama
      await loadMessages();
    } catch(e){ toast(e.message||'Gagal mengirim pesan.','e'); }
    finally { btn.disabled = false; input.focus(); }
  }
  document.getElementById('chatSend')?.addEventListener('click', send);
  document.getElementById('chatInput')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); send(); } });
}
