import { useEffect, useState } from 'react';
import { Search, AlertTriangle, History, BookOpenCheck, Download, UserCheck } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { fmtDMY } from '../../../utils/date';

const SUB_TABS = [
  { key: 'aktif', label: 'Aktif', icon: BookOpenCheck },
  { key: 'terlambat', label: 'Terlambat', icon: AlertTriangle },
  { key: 'riwayat', label: 'Riwayat', icon: History },
  { key: 'kunjungan', label: 'Kunjungan', icon: UserCheck },
];

const STATUS_BADGE = { dipinjam: 'badge-honey', dikembalikan: 'badge-brand', rusak: 'badge-rose', hilang: 'badge-rose' };

function DaftarPeminjaman({ data }) {
  const { page, setPage, totalPages, paginated } = usePagination(data, 15);

  return (
    <>
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium px-2">Buku</th>
              <th className="font-medium px-2">Peminjam</th>
              <th className="font-medium px-2">Pinjam</th>
              <th className="font-medium px-2">Jatuh Tempo</th>
              <th className="font-medium px-2">Kembali</th>
              <th className="font-medium px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2 text-ink-900 px-2"><TruncateText text={p.eksemplar?.buku?.judul || '-'} maxWidth="14rem" /></td>
                <td className="text-ink-700 px-2">
                  <span className={`badge-soft ${p.peminjam_type === 'guru' ? 'badge-honey' : 'badge-brand'} mr-1.5`}>{p.peminjam_type === 'guru' ? 'Guru' : 'Siswa'}</span>
                  {p.peminjam?.user?.name || '-'}
                </td>
                <td className="text-ink-700 px-2 whitespace-nowrap">{fmtDMY(p.tanggal_pinjam)}</td>
                <td className="text-ink-700 px-2 whitespace-nowrap">{fmtDMY(p.tanggal_jatuh_tempo)}</td>
                <td className="text-ink-700 px-2 whitespace-nowrap">{p.tanggal_kembali ? fmtDMY(p.tanggal_kembali) : '-'}</td>
                <td className="px-2">
                  <span className={`badge-soft ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  {p.terlambat && <span className="badge-soft badge-rose ml-1">+{p.hari_terlambat}h</span>}
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-300 px-2">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

function DaftarKunjungan({ data }) {
  const { page, setPage, totalPages, paginated } = usePagination(data, 15);

  return (
    <>
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium px-2">Tanggal</th>
              <th className="font-medium px-2">Pengunjung</th>
              <th className="font-medium px-2">Keperluan</th>
              <th className="font-medium px-2">Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((k) => (
              <tr key={k.id} className="border-t border-line-200">
                <td className="text-ink-700 px-2 whitespace-nowrap">{fmtDMY(k.tanggal)}</td>
                <td className="text-ink-700 px-2">
                  <span className={`badge-soft ${k.pengunjung_type === 'guru' ? 'badge-honey' : 'badge-brand'} mr-1.5`}>{k.pengunjung_type === 'guru' ? 'Guru' : 'Siswa'}</span>
                  {k.pengunjung?.user?.name || '-'}
                </td>
                <td className="text-ink-700 px-2"><TruncateText text={k.keperluan} maxWidth="12rem" /></td>
                <td className="text-ink-700 px-2">{k.dicatat_oleh?.name || '-'}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-ink-300 px-2">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

export default function PeminjamanTab() {
  const [subTab, setSubTab] = useState('aktif');
  const [data, setData] = useState([]);
  const [cariNama, setCariNama] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [rekapPeminjam, setRekapPeminjam] = useState(null);
  const [mulai, setMulai] = useState('');
  const [selesai, setSelesai] = useState('');

  const load = (tab) => {
    const endpoint = tab === 'kunjungan' ? '/perpustakaan-kunjungan/riwayat' : `/perpustakaan-peminjaman/${tab}`;
    return api.get(endpoint).then((res) => setData(res.data));
  };
  useEffect(() => { load(subTab); }, [subTab]);

  const handleCariNama = async (q) => {
    setCariNama(q);
    if (q.trim().length < 2) { setHasilCari([]); return; }
    const res = await api.get('/perpustakaan-sirkulasi/peminjam/cari', { params: { q } });
    setHasilCari(res.data);
  };

  const pilihPeminjam = async (p) => {
    setHasilCari([]);
    setCariNama('');
    const res = await api.get(`/perpustakaan-peminjaman/${p.tipe}/${p.id}`);
    setRekapPeminjam(res.data);
  };

  const handleExport = async (endpoint, namaFile) => {
    const params = {};
    if (mulai && selesai) { params.start = mulai; params.end = selesai; }
    const res = await api.get(endpoint, { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', namaFile);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };
  const handleExportRiwayat = () => handleExport('/perpustakaan-peminjaman/export-riwayat', 'laporan-riwayat-peminjaman.xlsx');
  const handleExportKunjungan = () => handleExport('/perpustakaan-kunjungan/export-riwayat', 'laporan-kunjungan-perpustakaan.xlsx');

  return (
    <div className="space-y-4">
      <div className="surface-card p-4">
        <label className="field-label flex items-center gap-1.5 mb-1.5"><Search className="w-3.5 h-3.5" /> Cek Peminjaman per Siswa/Guru</label>
        <div className="relative">
          <input
            value={cariNama} onChange={(e) => handleCariNama(e.target.value)}
            placeholder="Ketik nama siswa/guru (min. 2 huruf)..." className="field-input text-sm"
          />
          {hasilCari.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full divide-y divide-line-200 border border-line-200 bg-white rounded-lg overflow-hidden shadow-lg">
              {hasilCari.map((p) => (
                <li key={`${p.tipe}-${p.id}`}>
                  <button onClick={() => pilihPeminjam(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-mist-50 flex items-center gap-2">
                    <span className={`badge-soft ${p.tipe === 'guru' ? 'badge-honey' : 'badge-brand'} shrink-0`}>{p.tipe === 'guru' ? 'Guru' : 'Siswa'}</span>
                    <span className="min-w-0">
                      <span className="font-medium text-ink-900">{p.user.name}</span>
                      <span className="text-ink-500"> — {p.tipe === 'guru' ? p.nip : `${p.nis} · ${p.class_room?.name}`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rekapPeminjam && (
          <div className="mt-4 pt-4 border-t border-line-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`badge-soft ${rekapPeminjam.tipe === 'guru' ? 'badge-honey' : 'badge-brand'}`}>{rekapPeminjam.tipe === 'guru' ? 'Guru' : 'Siswa'}</span>
                <div>
                  <p className="font-semibold text-ink-900">{rekapPeminjam.peminjam.user.name}</p>
                  <p className="text-xs text-ink-500">{rekapPeminjam.tipe === 'guru' ? rekapPeminjam.peminjam.nip : `${rekapPeminjam.peminjam.nis} · ${rekapPeminjam.peminjam.class_room?.name}`}</p>
                </div>
              </div>
              <button onClick={() => setRekapPeminjam(null)} className="text-xs text-ink-500 hover:text-ink-700">Tutup</button>
            </div>
            <DaftarPeminjaman data={rekapPeminjam.peminjaman} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 w-fit">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${subTab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        {(subTab === 'riwayat' || subTab === 'kunjungan') && (
          <div className="flex items-center gap-2 flex-wrap">
            <DateInput value={mulai} onChange={(e) => setMulai(e.target.value)} className="field-input text-sm w-36" placeholder="Dari tanggal" max={selesai || undefined} />
            <span className="text-ink-400 text-sm">—</span>
            <DateInput value={selesai} onChange={(e) => setSelesai(e.target.value)} className="field-input text-sm w-36" placeholder="Sampai tanggal" min={mulai || undefined} />
            <button
              onClick={subTab === 'riwayat' ? handleExportRiwayat : handleExportKunjungan}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
            >
              <Download className="w-4 h-4" /> {subTab === 'riwayat' ? 'Export Riwayat (Excel)' : 'Export Kunjungan (Excel)'}
            </button>
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        {subTab === 'kunjungan' ? <DaftarKunjungan data={data} /> : <DaftarPeminjaman data={data} />}
      </div>
    </div>
  );
}
