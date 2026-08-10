import { useEffect, useMemo, useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, HeartHandshake, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import CetakSuratPeringatanModal from '../../../../components/CetakSuratPeringatanModal';

const PAGE_SIZE = 6;
const KATEGORI_LABEL = { akademik: 'Akademik', perilaku: 'Perilaku', sosial: 'Sosial', keluarga: 'Keluarga', lainnya: 'Lainnya' };

/**
 * Rekap Sanksi Bertingkat & Catatan BK sendiri — sama isinya dengan
 * section "BK" di Laporan Wali Kelas (BkReportSection.jsx) dan Rekap BK
 * Admin/Waka (RekapBkTab.jsx), tapi BEDA dari Wali Kelas: BK TIDAK
 * dibatasi backend ke 1 kelas (RestrictsGuruToOwnClass cuma berlaku untuk
 * role guru), jadi di sini ada filter Kelas sendiri supaya BK bisa lihat
 * kelas mana pun atau "Semua Kelas" sekaligus. Terikat tahun ajaran aktif
 * (tidak ada pemilih tahun ajaran seperti di dashboard Admin — dashboard
 * BK memang cuma untuk kerja tahun berjalan).
 */
export default function SanksiCatatanSection() {
  const [classes, setClasses] = useState([]);
  const [classRoomId, setClassRoomId] = useState('');
  const [kejadian, setKejadian] = useState([]);
  const [catatan, setCatatan] = useState([]);
  const [loading, setLoading] = useState(false);

  const [kejadianPage, setKejadianPage] = useState(1);
  const [catatanPage, setCatatanPage] = useState(1);
  const [cetakSurat, setCetakSurat] = useState(null);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadAll = () => {
    setLoading(true);
    const params = {};
    if (classRoomId) params.class_room_id = classRoomId;
    setKejadianPage(1);
    setCatatanPage(1);
    Promise.all([
      api.get('/sanksi-kejadian', { params }),
      api.get('/bk-cases', { params }),
    ])
      .then(([k, c]) => { setKejadian(k.data); setCatatan(c.data); })
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []); // eslint-disable-line

  const jumlahDiproses = useMemo(() => kejadian.filter((k) => k.status === 'diproses').length, [kejadian]);
  const jumlahSelesai = kejadian.length - jumlahDiproses;

  const perTahap = useMemo(() => {
    const map = new Map();
    kejadian.forEach((k) => {
      const nama = k.sanksi_rule?.nama || 'Tanpa tahap';
      if (!map.has(nama)) map.set(nama, { diproses: 0, selesai: 0 });
      map.get(nama)[k.status]++;
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kejadian]);

  const kejadianTerurut = useMemo(() => [...kejadian].sort((a, b) => b.created_at.localeCompare(a.created_at)), [kejadian]);
  const kejadianTotalPages = Math.max(1, Math.ceil(kejadianTerurut.length / PAGE_SIZE));
  const kejadianPaginated = kejadianTerurut.slice((kejadianPage - 1) * PAGE_SIZE, kejadianPage * PAGE_SIZE);

  const catatanTotalPages = Math.max(1, Math.ceil(catatan.length / PAGE_SIZE));
  const catatanPaginated = catatan.slice((catatanPage - 1) * PAGE_SIZE, catatanPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={loadAll} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <p className="text-xs text-ink-400 ml-auto">Tahun ajaran aktif.</p>
      </div>

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

      {perTahap.length > 0 && (
        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Kejadian per Tahap Sanksi</h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Tahap</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Diproses</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Selesai</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {perTahap.map(([nama, c]) => (
                  <tr key={nama} className="border-t border-line-200">
                    <td className="py-2 text-ink-900 font-medium whitespace-nowrap px-2">{nama}</td>
                    <td className="text-center whitespace-nowrap px-2">{c.diproses > 0 ? <span className="badge-soft badge-honey">{c.diproses}</span> : '-'}</td>
                    <td className="text-center whitespace-nowrap px-2">{c.selesai > 0 ? <span className="badge-soft badge-brand">{c.selesai}</span> : '-'}</td>
                    <td className="text-center text-ink-700 font-medium whitespace-nowrap px-2">{c.diproses + c.selesai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    <p className="text-ink-900 font-medium truncate"><TruncateText text={k.student?.user?.name} /> <span className="text-ink-400 font-normal">· {k.student?.class_room?.name || '-'}</span></p>
                    <p className="text-xs text-ink-500 truncate">{new Date(k.created_at).toLocaleDateString('id-ID')} &middot; {k.sanksi_rule?.nama || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCetakSurat(k)}
                      title="Buat Surat Peringatan (Word)"
                      className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-mist-50"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <span className={`badge-soft ${k.status === 'selesai' ? 'badge-brand' : 'badge-honey'}`}>{k.status === 'selesai' ? 'Selesai' : 'Diproses'}</span>
                  </div>
                </div>
              ))}
              {kejadian.length === 0 && <p className="py-6 text-center text-ink-300 text-sm">Belum ada kejadian sanksi untuk filter ini.</p>}
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
                    <p className="text-ink-900 font-medium truncate"><TruncateText text={c.student?.user?.name} /> <span className="text-ink-400 font-normal">· {c.student?.class_room?.name || '-'}</span></p>
                    <span className={`badge-soft shrink-0 ${c.status === 'selesai' ? 'badge-brand' : 'badge-honey'}`}>{c.status === 'selesai' ? 'Selesai' : 'Berjalan'}</span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{c.tanggal} &middot; {KATEGORI_LABEL[c.kategori]}{c.sanksi_kejadian && <> &middot; ↳ {c.sanksi_kejadian.sanksi_rule?.nama}</>}</p>
                  <p className="text-xs text-ink-700 mt-1"><TruncateText text={c.catatan} /></p>
                </div>
              ))}
              {catatan.length === 0 && <p className="py-6 text-center text-ink-300 text-sm">Belum ada catatan BK untuk filter ini.</p>}
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

      {cetakSurat && <CetakSuratPeringatanModal kejadian={cetakSurat} onClose={() => setCetakSurat(null)} />}
    </div>
  );
}
