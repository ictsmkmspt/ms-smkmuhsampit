import { useEffect, useState } from 'react';
import { LogIn, LogOut, Building2, User, Printer, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const STATUS_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };
const STATUS_BADGE = { hadir: 'badge-brand', izin: 'badge-honey', sakit: 'badge-honey', alpa: 'badge-rose' };

/**
 * Tampilan PKL untuk siswa yang sedang punya penempatan aktif — menggantikan
 * kartu QR barcode sepenuhnya selama masa PKL berlangsung. Absensi cukup klik
 * tombol (tanpa GPS), tapi baru sah setelah diverifikasi (di-paraf) DUDI.
 */
export default function PklSiswaView({ placement }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [posting, setPosting] = useState(''); // '' | 'masuk' | 'pulang'
  const [message, setMessage] = useState(null); // { type: 'ok'|'error', text }

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = history.find((h) => h.date === today);

  const loadHistory = () => {
    setLoadingHistory(true);
    return api.get('/my-pkl-attendances')
      .then((res) => setHistory(res.data))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleAbsen = async (jenis) => {
    setMessage(null);
    setPosting(jenis);
    try {
      const endpoint = jenis === 'masuk' ? '/pkl/absen-masuk' : '/pkl/absen-pulang';
      const res = await api.post(endpoint);
      setMessage({ type: 'ok', text: res.data.message });
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal mengirim absensi.' });
    } finally {
      setPosting('');
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-jurnal?placement_id=${placement.id}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(34,52,74,0.08)] border border-line-200">
        <div className="bg-brand-600 px-5 pt-5 pb-6 text-white">
          <p className="text-[10px] uppercase tracking-widest text-brand-100 mb-3">Sedang PKL</p>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg leading-tight">{placement.dudi?.nama_perusahaan}</p>
              <p className="text-xs text-brand-100 mt-0.5">{placement.dudi?.alamat || '-'}</p>
            </div>
          </div>
          {placement.guru_pembimbing?.user?.name && (
            <div className="flex items-center gap-2 mt-4 text-xs text-brand-100">
              <User className="w-3.5 h-3.5" /> Pembimbing: {placement.guru_pembimbing.user.name}
            </div>
          )}
        </div>

        <div className="bg-white p-5">
          {message && (
            <p className={`text-sm rounded-lg px-3 py-2 mb-4 ${
              message.type === 'ok'
                ? 'text-brand-700 bg-brand-50 border border-brand-200'
                : 'text-honey-700 bg-honey-50 border border-honey-200'
            }`}>
              {message.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAbsen('masuk')}
              disabled={!!posting || !!todayRow?.time_in}
              className="flex flex-col items-center gap-1.5 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed text-brand-700 rounded-xl py-4 transition"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-sm font-medium">
                {posting === 'masuk' ? 'Mengirim...' : todayRow?.time_in ? `Masuk ${todayRow.time_in.slice(0, 5)}` : 'Absen Masuk'}
              </span>
            </button>
            <button
              onClick={() => handleAbsen('pulang')}
              disabled={!!posting || !todayRow?.time_in || !!todayRow?.time_out}
              className="flex flex-col items-center gap-1.5 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed text-ink-700 rounded-xl py-4 transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">
                {posting === 'pulang' ? 'Mengirim...' : todayRow?.time_out ? `Pulang ${todayRow.time_out.slice(0, 5)}` : 'Absen Pulang'}
              </span>
            </button>
          </div>

          {todayRow && (
            <p className="flex items-center gap-1.5 text-xs mt-3">
              {todayRow.verified_at ? (
                <span className="flex items-center gap-1 text-brand-700"><CheckCircle2 className="w-3.5 h-3.5" /> Absensi hari ini sudah diverifikasi DUDI</span>
              ) : (
                <span className="text-honey-700">Menunggu verifikasi dari DUDI</span>
              )}
            </p>
          )}

          <button
            onClick={handleCetak}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 mt-4 w-full border border-line-200 rounded-xl py-2.5"
          >
            <Printer className="w-4 h-4" /> Cetak Jurnal PKL
          </button>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Riwayat Absensi PKL</h2>
        {loadingHistory ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
        ) : history.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada riwayat.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="border border-line-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="text-ink-900 font-medium">{h.date}</p>
                  <p className="text-xs text-ink-500">
                    {h.time_in ? h.time_in.slice(0, 5) : '--:--'} – {h.time_out ? h.time_out.slice(0, 5) : '--:--'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {h.verified_at && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                  <span className={`badge-soft ${STATUS_BADGE[h.status]}`}>{STATUS_LABEL[h.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
