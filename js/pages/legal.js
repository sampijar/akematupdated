'use strict';
// =========================================================
// Akemat Foundation — Halaman legal (TNC, Privasi, FAQ)
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() supaya tidak ikut ter-parse di initial load — halaman
// ini jarang dikunjungi dibanding beranda/pencarian perawat.
// Memakai helper global dari app.js (esc, emptyState, renderFooterSection, app).
// =========================================================

export function renderTNC(){
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
export function renderPrivacyPolicy(){
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
export function renderFAQ(){
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
  faqHTML += '<p class="lead">Temukan jawaban atas pertanyaan umum seputar Akemat Foundation. Tidak menemukan jawaban? <a href="https://wa.me/6285196407117" style="text-decoration:underline">Hubungi kami</a>.</p>';
  faqHTML += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px" id="faqCatRow">';
  faqHTML += '<button class="f-chip active" data-faq-cat="Semua">Semua</button>';
  faqCats.forEach(function(cat){
    faqHTML += '<button class="f-chip" data-faq-cat="'+cat+'">'+cat+'</button>';
  });
  faqHTML += '</div><div id="faqList"></div>';
  faqHTML += '<div style="background:var(--bg-alt);border-radius:var(--r-md);padding:24px;margin-top:32px;text-align:center">';
  faqHTML += '<h2 style="margin-bottom:8px;font-size:1.08rem">Masih ada pertanyaan?</h2>';
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
