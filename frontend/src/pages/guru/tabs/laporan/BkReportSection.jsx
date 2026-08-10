import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';

const PAGE_SIZE = 6;
const KATEGORI_LABEL = { akademik: 'Akademik', perilaku: 'Perilaku', sosial: 'Sosial', keluarga: 'Keluarga', lainnya: 'Lainnya' };

/**
 * Laporan BK untuk Wali Kelas — read-only, otomatis dibatasi ke kelas
 * walinya sendiri oleh backend (RestrictsGuruToOwnClass), sama seperti
 * section Absensi/Pelanggaran/Prestasi di tab Laporan ini. Guru yang
 * bukan wali kelas akan melihat data kosong (bukan tab-nya disembunyikan
 * — konsisten dengan section lain di Laporan).
 */
export default function BkReportSection() {
  const [kejadian, setKejadian] = useState([]);
  const [catatan, setCatatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kejadianPage, setKejadianPage] = useState(1);
  const [catatanPage, setCatatanPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/sanksi-kejadian'), api.get('/bk-cases')])
      .then(([k, c]) => { setKejadian(k.data); setCatatan(c.data); })
      .finally(() => setLoading(false));
  }, []);

  const jumlahDiproses = useMemo(() => kejadian.filter((k) => k.status === 'diproses').length, [kejadian]);
  const jumlahSelesai = kejadian.length - jumlahDiproses;

  const kejadianTerurut = useMemo(() => [...kejadian].sort((a, b) => b.created_at.localeCompare(a.created_at)), [kejadian]);
  const kejadianTotalPages = Math.max(1, Math.ceil(kejadianTerurut.length / PAGE_SIZE));
  const kejadianPaginated = kejadianTerurut.slice((kejadianPage - 1) * PAGE_SIZE, kejadianPage * PAGE_SIZE);

  const catatanTotalPages = Math.max(1, Math.ceil(catatan.length / PAGE_SIZE));
  const catatanPaginated = catatan.slice((catatanPage - 1) * PAGE_SIZE, catatanPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-ink-500 mb-1">Total Kejadian Sanksi</p>
          <p className="text-2xl font-display font-semibold text-ink-900">{kejadian.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-ink-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-honey-600" /> Diproses</p>
          <p className="text-2xl font-display font-semibold text-honey-700">{jumlahDiproses}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-ink-500 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> Selesai</p>
          <p className="text-2xl font-display font-semibold text-brand-700">{jumlahSelesai}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-ink-500 mb-1 flex items-center gap-1"><HeartHandshake className="w-3.5 h-3.5 text-ink-500" /> Catatan BK</p>
          <p className="text-2xl font-display font-semibold text-ink-900">{catatan.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Riwayat Kejadian Sanksi</h2>
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : (
            <div className="space-y-2">
              {kejadianPaginated.map((k) => (
                <div key={k.id} className="border border-line-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink-900 font-medium truncate"><TruncateText text={k.student?.user?.name} /></p>
                    <p className="text-xs text-ink-500 truncate">{new Date(k.created_at).toLocaleDateString('id-ID')} &middot; {k.sanksi_rule?.nama || '-'}</p>
                  </div>
                  <span className={`badge-soft shrink-0 ${k.status === 'selesai' ? 'badge-brand' : 'badge-honey'}`}>{k.status === 'selesai' ? 'Selesai' : 'Diproses'}</span>
                </div>
              ))}
              {kejadian.length === 0 && <p className="py-6 text-center text-ink-300 text-sm">Belum ada kejadian sanksi untuk kelas Anda.</p>}
            </div>
          )}
          {kejadianTerurut.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
              <button onClick={() => setKejadianPage((p) => Math.max(1, p - 1))} disabled={kejadianPage === 1} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <span className="text-xs text-ink-400">Halaman {kejadianPage} / {kejadianTotalPages}</span>
              <button onClick={() => setKejadianPage((p) => Math.min(kejadianTotalPages, p + 1))} disabled={kejadianPage === kejadianTotalPages} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Riwayat Catatan BK</h2>
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : (
            <div className="space-y-2">
              {catatanPaginated.map((c) => (
                <div key={c.id} className="border border-line-200 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-ink-900 font-medium truncate"><TruncateText text={c.student?.user?.name} /></p>
                    <span className={`badge-soft shrink-0 ${c.status === 'selesai' ? 'badge-brand' : 'badge-honey'}`}>{c.status === 'selesai' ? 'Selesai' : 'Berjalan'}</span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{c.tanggal} &middot; {KATEGORI_LABEL[c.kategori]}{c.sanksi_kejadian && <> &middot; ↳ {c.sanksi_kejadian.sanksi_rule?.nama}</>}</p>
                  <p className="text-xs text-ink-700 mt-1"><TruncateText text={c.catatan} /></p>
                </div>
              ))}
              {catatan.length === 0 && <p className="py-6 text-center text-ink-300 text-sm">Belum ada catatan BK untuk kelas Anda.</p>}
            </div>
          )}
          {catatan.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
              <button onClick={() => setCatatanPage((p) => Math.max(1, p - 1))} disabled={catatanPage === 1} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <span className="text-xs text-ink-400">Halaman {catatanPage} / {catatanTotalPages}</span>
              <button onClick={() => setCatatanPage((p) => Math.min(catatanTotalPages, p + 1))} disabled={catatanPage === catatanTotalPages} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
