import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen, Clock } from 'lucide-react';
import api from '../api/axios';
import TruncateText from './TruncateText';
import Pagination from './Pagination';
import usePagination from '../hooks/usePagination';
import { fmtDMY } from '../utils/date';

// Dipakai bersama oleh siswa (pages/siswa/PerpustakaanTab.jsx) & guru
// (pages/guru/tabs/BerandaTab.jsx) — keduanya bisa jadi peminjam buku
// (relasi polimorfik peminjam_type/peminjam_id di backend), tampilan
// "Peminjaman Saya"+"Katalog"-nya identik jadi 1 komponen saja.

function hariMenujuJatuhTempo(tgl) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const jt = new Date(tgl); jt.setHours(0, 0, 0, 0);
  return Math.round((jt - now) / 86400000);
}

export function PeminjamanSayaView() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/perpustakaan-peminjaman-saya').then((res) => setData(res.data)); }, []);

  if (data === null) return <p className="text-center text-ink-300 text-sm py-6">Memuat...</p>;

  return (
    <ul className="space-y-2.5">
      {data.map((p) => {
        const sisaHari = p.status === 'dipinjam' ? hariMenujuJatuhTempo(p.tanggal_jatuh_tempo) : null;
        let warna = 'badge-brand';
        let teks = p.status;
        if (p.status === 'dipinjam') {
          if (p.terlambat) { warna = 'badge-rose'; teks = `Terlambat ${p.hari_terlambat} hari`; }
          else if (sisaHari <= 2) { warna = 'badge-honey'; teks = sisaHari === 0 ? 'Jatuh tempo hari ini' : `${sisaHari} hari lagi`; }
          else { warna = 'badge-brand'; teks = 'Sedang dipinjam'; }
        } else if (p.status === 'dikembalikan') { warna = 'badge-soft'; teks = 'Dikembalikan'; }
        else { warna = 'badge-rose'; }

        return (
          <li key={p.id} className="surface-card p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-mist-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-ink-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900"><TruncateText text={p.eksemplar?.buku?.judul || '-'} maxWidth="100%" /></p>
              <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Pinjam {fmtDMY(p.tanggal_pinjam)} · Tempo {fmtDMY(p.tanggal_jatuh_tempo)}
                {p.tanggal_kembali && ` · Kembali ${fmtDMY(p.tanggal_kembali)}`}
              </p>
            </div>
            <span className={`badge-soft ${warna} shrink-0`}>{teks}</span>
          </li>
        );
      })}
      {data.length === 0 && <li className="text-center text-ink-300 text-sm py-6">Belum pernah meminjam buku.</li>}
    </ul>
  );
}

export function KatalogView() {
  const [buku, setBuku] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => { api.get('/perpustakaan-buku').then((res) => setBuku(res.data)); }, []);

  const bukuTersaring = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buku;
    return buku.filter((b) =>
      b.judul.toLowerCase().includes(q)
      || (b.penulis || '').toLowerCase().includes(q)
      || (b.kode_buku || '').toLowerCase().includes(q)
      || (b.kategori?.nama || '').toLowerCase().includes(q)
      || (b.rak?.nama || '').toLowerCase().includes(q)
    );
  }, [buku, query]);

  const { page, setPage, totalPages, paginated: bukuHalaman } = usePagination(bukuTersaring, 16);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul / penulis / kode buku / kategori / rak..." className="field-input pl-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {bukuHalaman.map((b) => (
          <div key={b.id} className="surface-card p-3">
            <div className="w-full aspect-[3/4] rounded-lg bg-mist-50 mb-2 flex items-center justify-center overflow-hidden">
              {b.cover_url ? <img src={b.cover_url} alt={b.judul} className="w-full h-full object-cover" /> : <BookOpen className="w-8 h-8 text-ink-300" />}
            </div>
            <p className="text-sm font-semibold text-ink-900 leading-tight"><TruncateText text={b.judul} maxWidth="100%" /></p>
            <p className="text-xs text-ink-500 mt-0.5"><TruncateText text={b.penulis || '-'} maxWidth="100%" /></p>
            <div className="mt-2">
              {(b.ringkasan_eksemplar?.tersedia ?? 0) > 0 ? (
                <span className="badge-soft badge-brand">{b.ringkasan_eksemplar.tersedia} tersedia</span>
              ) : (
                <span className="badge-soft badge-rose">Semua dipinjam</span>
              )}
            </div>
          </div>
        ))}
        {bukuTersaring.length === 0 && <p className="col-span-full text-center text-ink-300 text-sm py-6">{buku.length === 0 ? 'Belum ada data buku.' : 'Tidak ada buku yang cocok.'}</p>}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
