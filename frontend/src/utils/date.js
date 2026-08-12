// Tampilan tanggal di seluruh web pakai dd-mm-yyyy (format Indonesia) —
// data tersimpan & dikirim ke API tetap format ISO (yyyy-mm-dd) seperti
// biasa, cuma tampilannya yang dibalik. Satu sumber, dipakai di mana pun
// tanggal ISO perlu ditampilkan ke pengguna (tabel, daftar, badge) —
// KECUALI dokumen cetak resmi (nota/kwitansi/surat/kalender cetak) yang
// sengaja tetap pakai format panjang "11 Agustus 2026".
//
// `slice(0, 10)` dulu supaya aman dipakai baik untuk kolom tanggal murni
// (yyyy-mm-dd) MAUPUN datetime penuh dari Laravel (created_at dkk, format
// yyyy-mm-ddTHH:mm:ss atau yyyy-mm-dd HH:mm:ss) — 10 karakter pertama
// selalu bagian tanggalnya saja.
export const fmtDMY = (tanggalIso) => (tanggalIso ? tanggalIso.slice(0, 10).split('-').reverse().join('-') : '-');

// Sama seperti fmtDMY, tapi ikut menampilkan jam:menit — dipakai buat
// datetime yang jamnya juga relevan (mis. dicatat pukul berapa), bukan
// cuma tanggalnya.
export const fmtDMYHM = (tanggalIso) => {
  if (!tanggalIso) return '-';
  const tanggal = fmtDMY(tanggalIso);
  const cocokJam = tanggalIso.match(/(\d{2}):(\d{2})/);
  return cocokJam ? `${tanggal} ${cocokJam[1]}:${cocokJam[2]}` : tanggal;
};
