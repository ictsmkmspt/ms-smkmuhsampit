import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen, Clock, MapPin, X } from 'lucide-react';
import api from '../api/axios';
import TruncateText from './TruncateText';
import Pagination from './Pagination';
import usePagination from '../hooks/usePagination';
import { fmtDMY } from '../utils/date';

// Dipakai bersama oleh siswa (pages/siswa/PerpustakaanTab.jsx) & guru
// (pages/guru/tabs/BerandaTab.jsx) — keduanya bisa jadi peminjam buku
// (relasi polimorfik peminjam_type/peminjam_id di backend), tampilan
// "Peminjaman Buku"+"Katalog Buku"-nya identik jadi 1 komponen saja.

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
  const [kategoriList, setKategoriList] = useState([]);
  const [query, setQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [detailBuku, setDetailBuku] = useState(null);

  useEffect(() => { api.get('/perpustakaan-buku').then((res) => setBuku(res.data)); }, []);
  useEffect(() => { api.get('/perpustakaan-kategori').then((res) => setKategoriList(res.data)); }, []);

  const bukuTersaring = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buku.filter((b) => {
      const cocokKategori = !kategoriFilter || String(b.kategori?.id) === kategoriFilter;
      const cocokCari = !q
        || b.judul.toLowerCase().includes(q)
        || (b.penulis || '').toLowerCase().includes(q)
        || (b.kode_buku || '').toLowerCase().includes(q)
        || (b.kategori?.nama || '').toLowerCase().includes(q)
        || (b.rak?.nama || '').toLowerCase().includes(q);
      return cocokKategori && cocokCari;
    });
  }, [buku, query, kategoriFilter]);

  const { page, setPage, totalPages, paginated: bukuHalaman } = usePagination(bukuTersaring, 16);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul / penulis / kode buku / kategori / rak..." className="field-input pl-9 w-full" />
        </div>
        <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="field-input text-ink-700 sm:w-48">
          <option value="">Semua Kategori</option>
          {kategoriList.map((k) => <option key={k.id} value={String(k.id)}>{k.nama}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {bukuHalaman.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setDetailBuku(b)}
            className="surface-card p-3 text-left hover:shadow-md hover:-translate-y-0.5 transition"
          >
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
          </button>
        ))}
        {bukuTersaring.length === 0 && <p className="col-span-full text-center text-ink-300 text-sm py-6">{buku.length === 0 ? 'Belum ada data buku.' : 'Tidak ada buku yang cocok.'}</p>}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {detailBuku && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDetailBuku(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900">Detail Buku</h3>
              <button onClick={() => setDetailBuku(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Lokasi rak SENGAJA paling atas — ini info paling dicari
                  peminjam begitu tahu bukunya ada, supaya langsung tahu
                  mau ke rak mana tanpa scroll cari-cari dulu. */}
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4.5 h-4.5 text-brand-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-brand-700">Lokasi Rak</p>
                  <p className="text-sm font-semibold text-ink-900">{detailBuku.rak?.nama || 'Belum ditentukan'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-20 aspect-[3/4] rounded-lg bg-mist-50 shrink-0 overflow-hidden flex items-center justify-center">
                  {detailBuku.cover_url ? <img src={detailBuku.cover_url} alt={detailBuku.judul} className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 text-ink-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900 leading-tight">{detailBuku.judul}</p>
                  <p className="text-sm text-ink-500 mt-0.5">{detailBuku.penulis || 'Penulis tidak diketahui'}</p>
                  {detailBuku.kategori && <span className="badge-soft badge-brand mt-1.5 inline-block">{detailBuku.kategori.nama}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-ink-500">Penerbit</p>
                  <p className="text-ink-900">{detailBuku.penerbit || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500">Tahun Terbit</p>
                  <p className="text-ink-900">{detailBuku.tahun_terbit || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500">ISBN</p>
                  <p className="text-ink-900">{detailBuku.isbn || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500">Kode Buku</p>
                  <p className="text-ink-900 font-mono">{detailBuku.kode_buku || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-ink-500 mb-1.5">Ketersediaan</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge-soft badge-brand">{detailBuku.ringkasan_eksemplar?.tersedia ?? 0} tersedia</span>
                  <span className="badge-soft badge-honey">{detailBuku.ringkasan_eksemplar?.dipinjam ?? 0} dipinjam</span>
                  {(detailBuku.ringkasan_eksemplar?.rusak ?? 0) > 0 && <span className="badge-soft badge-rose">{detailBuku.ringkasan_eksemplar.rusak} rusak</span>}
                  {(detailBuku.ringkasan_eksemplar?.hilang ?? 0) > 0 && <span className="badge-soft badge-rose">{detailBuku.ringkasan_eksemplar.hilang} hilang</span>}
                </div>
              </div>

              {detailBuku.sinopsis && (
                <div>
                  <p className="text-[11px] text-ink-500 mb-1">Sinopsis</p>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{detailBuku.sinopsis}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
