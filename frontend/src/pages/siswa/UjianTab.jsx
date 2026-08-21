import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, X, Clock, ListChecks } from 'lucide-react';
import api from '../../api/axios';

const STORAGE_KEY = 'cbt_unlocked_exams';

// Ujian yang sudah dibuka pakai token tapi belum ditekan "Mulai Sekarang"
// disimpan di localStorage (bukan cuma state React) — supaya kalau siswa
// pindah tab lain lalu balik lagi ke Ujian, atau menutup lalu membuka
// ulang browser, ujian itu masih ada di tabel tanpa perlu ketik token lagi.
const loadUnlocked = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveUnlocked = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

export default function UjianTab() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [unlocked, setUnlocked] = useState(loadUnlocked);
  const [preview, setPreview] = useState(null); // item unlocked yang lagi dikonfirmasi
  const [berjalan, setBerjalan] = useState([]);

  const loadBerjalan = () => {
    api.get('/my-cbt-attempts').then((res) => {
      setBerjalan(res.data.filter((a) => a.status === 'in_progress' && a.exam?.tipe === 'ujian'));
    });
  };

  useEffect(loadBerjalan, []);

  const handleCekToken = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const res = await api.get('/cbt-exams/preview', { params: { token: token.trim() } });
      setUnlocked((prev) => {
        const next = [...prev.filter((x) => x.token !== res.data.token), res.data];
        saveUnlocked(next);
        return next;
      });
      setToken('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuka ujian.');
    } finally {
      setChecking(false);
    }
  };

  const handleMulai = async () => {
    setStarting(true);
    try {
      const res = await api.post('/cbt-exams/join', { token: preview.token });
      if (res.data.device_token) {
        localStorage.setItem(`cbt_device_${res.data.attempt_id}`, res.data.device_token);
      }
      setUnlocked((prev) => {
        const next = prev.filter((x) => x.token !== preview.token);
        saveUnlocked(next);
        return next;
      });
      navigate(`/ujian/exam/${res.data.attempt_id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuka ujian.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="surface-card p-4">
        <h2 className="font-display font-semibold text-sm text-ink-900 mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-ink-500" /> Masukkan Token Ujian
        </h2>
        <form onSubmit={handleCekToken} className="flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="Token dari pengawas"
            className="field-input flex-1 font-mono tracking-widest text-center"
            maxLength={8}
            required
          />
          <button disabled={checking || !token.trim()} className="btn-primary shrink-0">{checking ? '...' : 'Buka'}</button>
        </form>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mt-3">{error}</p>}

        {(unlocked.length > 0 || berjalan.length > 0) && (
          <div className="mt-4 pt-4 border-t border-line-200">
            <p className="text-xs font-medium text-ink-500 mb-2">Ujian Tersedia</p>
            <ul className="divide-y divide-line-200">
              {berjalan.map((a) => (
                <li key={`b-${a.id}`} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink-900 truncate">{a.exam?.nama}</p>
                    <p className="text-xs text-ink-500">{a.exam?.subject?.nama} &middot; sedang dikerjakan</p>
                  </div>
                  <button onClick={() => navigate(`/ujian/exam/${a.id}`)} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition shrink-0">
                    Lanjutkan
                  </button>
                </li>
              ))}
              {unlocked.map((u) => (
                <li key={`u-${u.token}`} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink-900 truncate">{u.nama}</p>
                    <p className="text-xs text-ink-500">{u.mapel} &middot; {u.jumlah_soal} soal &middot; {u.durasi_menit} menit</p>
                  </div>
                  <button onClick={() => setPreview(u)} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition shrink-0">
                    Kerjakan
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-400">Lihat nilai ujian yang sudah selesai di tab Nilai.</p>

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">Detail Ujian</h3>
              <button onClick={() => setPreview(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-ink-900">{preview.nama}</p>
                <p className="text-sm text-ink-500">{preview.mapel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-mist-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-ink-400" />
                  <div><p className="text-sm font-semibold text-ink-900">{preview.jumlah_soal}</p><p className="text-[10px] text-ink-500">Soal</p></div>
                </div>
                <div className="bg-mist-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-ink-400" />
                  <div><p className="text-sm font-semibold text-ink-900">{preview.durasi_menit}</p><p className="text-[10px] text-ink-500">Menit</p></div>
                </div>
              </div>
              <ul className="text-xs text-ink-500 space-y-1.5 list-disc pl-4">
                <li>Waktu mulai berjalan begitu Anda menekan &ldquo;Mulai Sekarang&rdquo; dan tidak bisa dijeda.</li>
                <li>Soal &amp; urutan pilihan jawaban acak untuk tiap siswa.</li>
                <li>Ujian ini cuma bisa dilanjutkan dari perangkat/browser yang sama dengan saat memulai.</li>
              </ul>
              <button onClick={handleMulai} disabled={starting} className="btn-primary w-full justify-center">
                {starting ? 'Membuka...' : 'Mulai Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
