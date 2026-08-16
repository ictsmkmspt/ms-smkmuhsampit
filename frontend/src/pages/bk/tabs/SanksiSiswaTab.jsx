import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X, CheckCircle2, NotebookPen, FileDown } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import CetakSuratPeringatanModal from '../../../components/CetakSuratPeringatanModal';
import { fmtDMY, fmtDMYHM } from '../../../utils/date';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

const STATUS_LABEL = { diproses: 'Diproses', selesai: 'Selesai' };
const STATUS_BADGE = { diproses: 'badge-honey', selesai: 'badge-brand' };

/**
 * Daftar siswa yang masuk tahap Sanksi Bertingkat — dibuat otomatis begitu
 * total_poin siswa melewati ambang batas (lihat Student::tambahPoin()),
 * bukan daftar yang perlu diisi manual. BK tinggal menindaklanjuti lalu
 * menandai selesai, atau mencatat tindak lanjutnya di tab Catatan BK.
 */
export default function SanksiSiswaTab({ onCatatTindakLanjut }) {
  const [statusFilter, setStatusFilter] = useState('diproses');
  const [kejadian, setKejadian] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewing, setViewing] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [cetakSurat, setCetakSurat] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/sanksi-kejadian', { params: statusFilter ? { status: statusFilter } : {} })
      .then((res) => setKejadian(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [statusFilter]); // eslint-disable-line

  const jumlahDiproses = useMemo(() => kejadian.filter((k) => k.status === 'diproses').length, [kejadian]);
  const { page, setPage, totalPages, paginated: kejadianHalaman } = usePagination(kejadian, 30);

  const bukaDetail = (k) => {
    setViewing(k);
    setCatatan('');
  };

  const handleSelesaikan = async () => {
    setSaving(true);
    try {
      await api.post(`/sanksi-kejadian/${viewing.id}/selesaikan`, { catatan_penyelesaian: catatan || undefined });
      setViewing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menandai selesai.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="surface-card p-4 mb-4 border-l-4 border-l-honey-400 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Daftar ini terisi otomatis begitu poin pelanggaran siswa melewati ambang batas tahap sanksi — tidak perlu diinput manual. {jumlahDiproses > 0 && <b>{jumlahDiproses} kejadian menunggu ditindaklanjuti.</b>}
        </p>
      </div>

      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit">
        {[{ key: 'diproses', label: 'Diproses' }, { key: 'selesai', label: 'Selesai' }, { key: '', label: 'Semua' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              statusFilter === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Siswa</th>
                <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Tahap Sanksi</th>
                <th className="pb-2 pt-3 font-medium text-center whitespace-nowrap px-2">Poin</th>
                <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Tanggal</th>
                <th className="pb-2 pt-3 pr-4 font-medium text-center whitespace-nowrap px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {kejadianHalaman.map((k) => (
                <tr key={k.id} onClick={() => bukaDetail(k)} className="border-t border-line-200 cursor-pointer hover:bg-mist-50 transition">
                  <td className="py-2.5 pl-4 whitespace-nowrap px-2">
                    <p className="text-ink-900 font-medium"><TruncateText text={k.student?.user?.name} /></p>
                    <p className="text-xs text-ink-400">{k.student?.class_room?.name}</p>
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{k.sanksi_rule?.nama || '-'}</td>
                  <td className="text-center text-ink-700 whitespace-nowrap px-2">{k.total_poin_saat_itu}</td>
                  <td className="text-ink-500 font-mono text-xs whitespace-nowrap px-2">{fmtDMY(k.created_at)}</td>
                  <td className="pr-4 text-center whitespace-nowrap px-2">
                    <span className={`badge-soft ${STATUS_BADGE[k.status]}`}>{STATUS_LABEL[k.status]}</span>
                  </td>
                </tr>
              ))}
              {!loading && kejadian.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-ink-300">
                  {statusFilter === 'diproses' ? 'Tidak ada kejadian yang perlu ditindaklanjuti saat ini.' : 'Belum ada kejadian.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4" />
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setViewing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-ink-900 truncate">{viewing.student?.user?.name}</h3>
                <p className="text-xs text-ink-500 mt-0.5">{viewing.student?.class_room?.name} &middot; {viewing.total_poin_saat_itu} poin</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              <div>
                <p className="text-xs font-medium text-ink-500 mb-1">Tahap Sanksi</p>
                <p className="text-sm text-ink-900 font-medium">{viewing.sanksi_rule?.nama || '-'}</p>
                {viewing.sanksi_rule?.tindakan && <p className="text-xs text-ink-500 mt-0.5">{viewing.sanksi_rule.tindakan}</p>}
              </div>

              {viewing.status === 'selesai' ? (
                <div className="rounded-xl bg-brand-50 border border-brand-200 p-3">
                  <p className="text-xs font-medium text-brand-700 flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai ditindaklanjuti</p>
                  <p className="text-xs text-ink-500">oleh {viewing.diproses_oleh?.name || '-'} &middot; {viewing.selesai_at ? fmtDMYHM(viewing.selesai_at) : ''}</p>
                  {viewing.catatan_penyelesaian && <p className="text-sm text-ink-700 mt-2">{viewing.catatan_penyelesaian}</p>}
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-line-200">
                  <textarea
                    placeholder="Catatan penyelesaian (opsional)"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="field-input min-h-[70px]"
                  />
                  <button onClick={handleSelesaikan} disabled={saving} className="btn-primary w-full justify-center">
                    <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Tandai Selesai'}
                  </button>
                </div>
              )}

              <button
                onClick={() => { onCatatTindakLanjut(viewing); setViewing(null); }}
                className="w-full text-sm px-3 py-2 rounded-lg border border-line-200 text-ink-700 hover:bg-mist-50 flex items-center justify-center gap-1.5"
              >
                <NotebookPen className="w-4 h-4" /> Catat Tindak Lanjut di Catatan BK
              </button>

              <button
                onClick={() => setCetakSurat(viewing)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-line-200 text-ink-700 hover:bg-mist-50 flex items-center justify-center gap-1.5"
              >
                <FileDown className="w-4 h-4" /> Buat Surat Peringatan (Word)
              </button>
            </div>
          </div>
        </div>
      )}

      {cetakSurat && <CetakSuratPeringatanModal kejadian={cetakSurat} onClose={() => setCetakSurat(null)} />}
    </div>
  );
}
