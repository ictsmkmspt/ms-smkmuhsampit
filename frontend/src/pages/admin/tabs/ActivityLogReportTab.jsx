import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, X, History } from 'lucide-react';
import api from '../../../api/axios';
import DateInput from '../../../components/DateInput';
import { fmtDMYHM } from '../../../utils/date';

const AKSI_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'dibuat', label: 'Dibuat' },
  { value: 'diubah', label: 'Diubah' },
  { value: 'dihapus', label: 'Dihapus' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
];

const AKSI_BADGE = {
  dibuat: 'badge-brand',
  diubah: 'badge-honey',
  dihapus: 'badge-rose',
  login: 'badge-brand',
  logout: 'badge-soft',
};

// Log Aktivitas — admin-only, mencatat SEMUA kegiatan (dibuat/diubah/
// dihapus di semua model + login/logout), diisi otomatis lewat hook
// event Eloquent global (lihat AppServiceProvider::registerActivityLogging
// di backend). Pagination server-side ASLI (kirim `page`, baca meta dari
// Laravel paginator) — BEDA dari pola fetch-all-lalu-slice di
// ViolationReportTab.jsx, karena tabel ini tidak dibatasi retensi dan
// bisa sangat besar.
export default function ActivityLogReportTab() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [modelTypes, setModelTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLog, setDetailLog] = useState(null);

  const [filter, setFilter] = useState({ date_from: '', date_to: '', aksi: '', model_type: '', q: '' });
  const [appliedFilter, setAppliedFilter] = useState(filter);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/activity-logs/model-types').then((res) => setModelTypes(res.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = { page, ...Object.fromEntries(Object.entries(appliedFilter).filter(([, v]) => v)) };
    api.get('/activity-logs', { params })
      .then((res) => {
        setLogs(res.data.data);
        setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, appliedFilter]); // eslint-disable-line

  const terapkanFilter = () => {
    setPage(1);
    setAppliedFilter(filter);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Dari Tanggal</label>
          <DateInput value={filter.date_from} onChange={(e) => setFilter((f) => ({ ...f, date_from: e.target.value }))} className="field-input text-sm w-40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Sampai Tanggal</label>
          <DateInput value={filter.date_to} onChange={(e) => setFilter((f) => ({ ...f, date_to: e.target.value }))} className="field-input text-sm w-40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Aksi</label>
          <select value={filter.aksi} onChange={(e) => setFilter((f) => ({ ...f, aksi: e.target.value }))} className="field-input text-sm text-ink-700">
            {AKSI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Jenis Data</label>
          <select value={filter.model_type} onChange={(e) => setFilter((f) => ({ ...f, model_type: e.target.value }))} className="field-input text-sm text-ink-700">
            <option value="">Semua Jenis</option>
            {modelTypes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Cari (aktor / deskripsi)</label>
          <input
            type="text" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && terapkanFilter()}
            className="field-input text-sm" placeholder="mis. nama guru, nama siswa..."
          />
        </div>
        <button onClick={terapkanFilter} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Log Aktivitas</h2>
          <span className="text-xs text-ink-400 ml-auto">{meta.total} baris</span>
        </div>

        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Waktu</th>
                  <th className="font-medium whitespace-nowrap px-2">Aktor</th>
                  <th className="font-medium whitespace-nowrap px-2">Aksi</th>
                  <th className="font-medium whitespace-nowrap px-2">Jenis Data</th>
                  <th className="font-medium whitespace-nowrap px-2">Deskripsi</th>
                  <th className="font-medium whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2 text-ink-500 text-xs">{fmtDMYHM(l.created_at)}</td>
                    <td className="whitespace-nowrap px-2">
                      <p className="text-ink-900 font-medium">{l.actor_nama || <span className="text-ink-300 italic">Sistem</span>}</p>
                      {l.actor_role && <p className="text-[11px] text-ink-400">{l.actor_role}</p>}
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <span className={`badge-soft ${AKSI_BADGE[l.aksi] || 'badge-soft'}`}>{AKSI_OPTIONS.find((o) => o.value === l.aksi)?.label || l.aksi}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 text-ink-700">{l.model_type || '-'}</td>
                    <td className="px-2 text-ink-700 max-w-xs truncate">{l.model_label || '-'}</td>
                    <td className="whitespace-nowrap px-2">
                      {l.perubahan && (
                        <button onClick={() => setDetailLog(l)} className="text-xs font-medium text-brand-600 hover:underline">
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan="6" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada log untuk filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page === 1}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-xs text-ink-400">Halaman {meta.current_page} / {meta.last_page}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page === meta.last_page}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDetailLog(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900">Detail Perubahan</h3>
              <button onClick={() => setDetailLog(null)} className="text-ink-300 hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <p className="text-xs text-ink-500 mb-3">
                {detailLog.model_type} — {detailLog.model_label} · {fmtDMYHM(detailLog.created_at)} oleh {detailLog.actor_nama || 'Sistem'}
              </p>
              <div className="space-y-2">
                {Object.entries(detailLog.perubahan || {}).map(([field, value]) => (
                  <div key={field} className="border border-line-200 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-ink-400 font-medium">{field}</p>
                    <p className="text-sm text-ink-900 break-words">{value === null ? <span className="italic text-ink-300">(kosong)</span> : String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
