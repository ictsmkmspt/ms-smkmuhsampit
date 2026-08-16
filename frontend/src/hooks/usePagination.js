import { useEffect, useState } from 'react';

// Paginasi client-side generik — pola sama yang sudah dipakai di
// SiswaDashboard.jsx (Riwayat Poin/Absensi) & ParentDashboard.jsx, cuma
// diekstrak jadi 1 hook supaya tidak diulang-tulis manual di tiap tabel.
// Halaman otomatis direset ke 1 kalau `data` berubah (mis. karena filter
// baru diterapkan) supaya tidak "terdampar" di halaman kosong.
//
// Dependency effect sengaja pakai IDENTITAS `data` (bukan `data.length`) —
// panjang yang sama antara filter lama & filter baru itu kebetulan biasa
// terjadi, dan kalau cuma mengandalkan panjang, halaman tidak ikut reset
// walau isinya sudah beda sama sekali. Konsekuensinya: pemanggil WAJIB
// mengoper array yang identitasnya stabil antar-render kalau isinya belum
// berubah — array hasil useState() sudah otomatis begitu, tapi hasil
// `.filter()`/`.map()` yang dihitung ulang tiap render HARUS dibungkus
// useMemo() dulu, kalau tidak halaman akan ke-reset terus tiap render.
export default function usePagination(data, pageSize = 10) {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { page: safePage, setPage, totalPages, paginated, pageSize };
}
