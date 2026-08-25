import { useEffect, useState } from 'react';
import { Check, X, Building2 } from 'lucide-react';
import api from '../../../api/axios';
import { fmtDMY } from '../../../utils/date';

const STATUS_TABS = [
  { key: '', label: 'Semua' },
  { key: 'diajukan', label: 'Diajukan' },
  { key: 'diterima', label: 'Diterima' },
  { key: 'ditolak', label: 'Ditolak' },
];

const STATUS_BADGE = {
  diajukan: 'badge-honey',
  diterima: 'badge-brand',
  ditolak: 'badge-rose',
};

/**
 * Lamaran masuk lintas semua mitra IDUKA — beda dari daftar pelamar milik
 * IDUKA (yang cuma lihat lowongannya sendiri). BKK juga boleh terima/tolak
 * pelamar sesuai rancangan alur "IDUKA/BKK ubah status sesuai proses
 * rekrutmen".
 */
export default function LamaranMasukTab() {
  const [status, setStatus] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/bkk/lamaran', { params: status ? { status } : {} }).then((res) => { setList(res.data); setLoading(false); });
  };
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const handleStatus = async (a, newStatus) => {
    setProcessingId(a.id);
    try {
      await api.put(`/bkk/lamaran/${a.id}`, { status: newStatus });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 w-fit overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              status === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada lamaran.</div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{a.student?.user?.name || '-'}</p>
                  <p className="text-xs text-ink-500 truncate">{a.student?.jurusan?.nama || '-'}</p>
                </div>
                <span className={`badge-soft shrink-0 ${STATUS_BADGE[a.status]}`}>
                  {a.status === 'diterima' ? 'Diterima' : a.status === 'ditolak' ? 'Ditolak' : 'Diajukan'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-2">
                <Building2 className="w-3.5 h-3.5" /> {a.job_vacancy?.posisi} &middot; {a.job_vacancy?.iduka?.nama_perusahaan}
              </div>
              <p className="text-xs text-ink-400 mt-1">Dilamar {fmtDMY(a.created_at)}</p>

              {a.status === 'diajukan' && (
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-line-200">
                  <button
                    onClick={() => handleStatus(a, 'diterima')}
                    disabled={processingId === a.id}
                    className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Terima
                  </button>
                  <button
                    onClick={() => handleStatus(a, 'ditolak')}
                    disabled={processingId === a.id}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-honey-700 border border-line-200 rounded-lg px-2.5 py-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
