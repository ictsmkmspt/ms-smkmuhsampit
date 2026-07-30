import { useEffect, useState } from 'react';
import {
  LogIn, LogOut, Building2, User, Printer, CheckCircle2,
  ClipboardCheck, NotebookPen, X, CalendarOff, Thermometer,
} from 'lucide-react';
import api from '../../api/axios';
import PklJurnalTab from './PklJurnalTab';

const STATUS_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };
const STATUS_BADGE = { hadir: 'badge-brand', izin: 'badge-honey', sakit: 'badge-honey', alpa: 'badge-rose' };

/**
 * Tampilan PKL untuk siswa yang sedang punya penempatan aktif — menggantikan
 * kartu QR barcode sepenuhnya selama masa PKL berlangsung. Ada 2 sub-menu
 * lewat navbar bawah (Absensi & Jurnal Kegiatan), mengikuti pola yang sama
 * dengan dashboard Guru.
 */
export default function PklSiswaView({ placement }) {
  const [tab, setTab] = useState('absensi'); // 'absensi' | 'jurnal'

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [posting, setPosting] = useState(''); // '' | 'masuk' | 'pulang'
  const [message, setMessage] = useState(null); // { type: 'ok'|'error', text }

  const [izinSakitJenis, setIzinSakitJenis] = useState(null); // null | 'izin' | 'sakit'
  const [izinTanggal, setIzinTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [izinAlasan, setIzinAlasan] = useState('');
  const [savingIzin, setSavingIzin] = useState(false);
  const [izinError, setIzinError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const maxTanggalIzin = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayRow = history.find((h) => h.date === today);

  const loadHistory = () => {
    setLoadingHistory(true);
    return api.get('/my-pkl-attendances')
      .then((res) => setHistory(res.data))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleAbsen = (jenis) => {
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Perangkat/browser ini tidak mendukung fitur lokasi.' });
      return;
    }

    setPosting(jenis);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const endpoint = jenis === 'masuk' ? '/pkl/absen-masuk' : '/pkl/absen-pulang';
          const res = await api.post(endpoint, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setMessage({ type: 'ok', text: res.data.message });
          loadHistory();
        } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal mengirim absensi.' });
        } finally {
          setPosting('');
        }
      },
      (err) => {
        setMessage({
          type: 'error',
          text: 'Gagal mengambil lokasi: ' + err.message + '. Pastikan izin lokasi diaktifkan, dan situs ini diakses lewat https:// atau localhost.',
        });
        setPosting('');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const bukaIzinSakit = (jenis) => {
    setIzinSakitJenis(jenis);
    setIzinTanggal(today);
    setIzinAlasan('');
    setIzinError('');
  };

  const handleSubmitIzinSakit = async (e) => {
    e.preventDefault();
    setIzinError('');
    setSavingIzin(true);
    try {
      const res = await api.post('/pkl/izin-sakit', {
        date: izinTanggal,
        status: izinSakitJenis,
        alasan: izinAlasan,
      });
      setMessage({ type: 'ok', text: res.data.message });
      setIzinSakitJenis(null);
      loadHistory();
    } catch (err) {
      setIzinError(err.response?.data?.message || 'Gagal mengirim pengajuan.');
    } finally {
      setSavingIzin(false);
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-jurnal?placement_id=${placement.id}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(34,52,74,0.08)] border border-line-200">
        <div className="bg-brand-600 px-5 pt-5 pb-6 text-white">
          <p className="text-[10px] uppercase tracking-widest text-brand-100 mb-3">PKL</p>
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
      </div>

      {tab === 'jurnal' ? (
        <PklJurnalTab placement={placement} />
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(34,52,74,0.08)] border border-line-200 bg-white p-5">
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

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={() => bukaIzinSakit('izin')}
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-xl py-2.5"
              >
                <CalendarOff className="w-4 h-4" /> Izin
              </button>
              <button
                onClick={() => bukaIzinSakit('sakit')}
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-xl py-2.5"
              >
                <Thermometer className="w-4 h-4" /> Sakit
              </button>
            </div>

            {todayRow && (
              <p className="flex items-center gap-1.5 text-xs mt-3">
                {todayRow.status !== 'hadir' ? (
                  <span className="text-ink-500">Status hari ini: {STATUS_LABEL[todayRow.status]}</span>
                ) : todayRow.verified_at ? (
                  <span className="flex items-center gap-1 text-brand-700"><CheckCircle2 className="w-3.5 h-3.5" /> Absensi hari ini sudah diverifikasi DUDI</span>
                ) : (
                  <span className="text-honey-700">Menunggu verifikasi dari DUDI</span>
                )}
              </p>
            )}
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-900">Riwayat Absensi PKL</h2>
              <button
                onClick={handleCetak}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            </div>
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
                        {h.status === 'hadir'
                          ? `${h.time_in ? h.time_in.slice(0, 5) : '--:--'} – ${h.time_out ? h.time_out.slice(0, 5) : '--:--'}`
                          : (h.catatan_koreksi || '-')}
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
        </>
      )}

      {/* Navbar bawah, mengikuti pola yang sama dengan dashboard Guru */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-40">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setTab('absensi')}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
              tab === 'absensi' ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            <ClipboardCheck className={`w-6 h-6 ${tab === 'absensi' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] font-medium tracking-wide">Absensi</span>
            {tab === 'absensi' && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setTab('jurnal')}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
              tab === 'jurnal' ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            <NotebookPen className={`w-6 h-6 ${tab === 'jurnal' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] font-medium tracking-wide">Jurnal Kegiatan</span>
            {tab === 'jurnal' && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* Popup pengajuan Izin/Sakit */}
      {izinSakitJenis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setIzinSakitJenis(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-start justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">
                Ajukan {izinSakitJenis === 'izin' ? 'Izin' : 'Sakit'}
              </h3>
              <button onClick={() => setIzinSakitJenis(null)} className="text-ink-300 hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIzinSakit} className="p-5 space-y-3">
              {izinError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{izinError}</p>}

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal</label>
                <input
                  type="date" value={izinTanggal} onChange={(e) => setIzinTanggal(e.target.value)}
                  max={maxTanggalIzin} className="field-input" required
                />
                <p className="text-xs text-ink-400 mt-1">Bisa untuk hari yang sudah lewat, atau maksimal 14 hari ke depan.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">
                  Alasan {izinSakitJenis === 'izin' ? 'Izin' : 'Sakit'}
                </label>
                <textarea
                  value={izinAlasan} onChange={(e) => setIzinAlasan(e.target.value)}
                  className="field-input w-full min-h-[90px]" rows="3"
                  placeholder={izinSakitJenis === 'izin' ? 'Contoh: Ada urusan keluarga' : 'Contoh: Demam sejak semalam'}
                  required
                />
              </div>

              <button disabled={savingIzin} className="btn-primary w-full justify-center">
                {savingIzin ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
