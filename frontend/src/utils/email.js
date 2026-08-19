const DOMAIN = '@smkmuhsampit.sch.id';

// Ubah nama jadi bagian depan email sekolah, mis. "Ahmad Fauzan" jadi
// "ahmadfauzan@smkmuhsampit.sch.id" — dipakai buat auto-isi email saat
// menambah akun baru (guru, TU, BK, admin, siswa, pustakawan, kepala
// bengkel/teknisi), supaya operator tidak perlu ketik email manual.
export function namaKeEmailSekolah(nama) {
  const local = (nama || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '');
  return local ? `${local}${DOMAIN}` : '';
}
