import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ListChecks } from 'lucide-react';
import api from '../../api/axios';

export default function LatihanTab() {
  const navigate = useNavigate();
  const [latihan, setLatihan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState(null); // item latihan yang mau dikonfirmasi

  const load = () => {
    api.get('/my-cbt-latihan').then((res) => setLatihan(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const dikelompokkan = useMemo(() => {
    const map = new Map();
    latihan.forEach((l) => {
      if (!map.has(l.mapel)) map.set(l.mapel, []);
      map.get(l.mapel).push(l);
    });
    return [...map.entries()];
  }, [latihan]);

  const handleMulai = async () => {
    setStarting(true);
    try {
      const res = await api.post(`/cbt-latihan/${preview.id}/start`);
      if (res.data.device_token) {
        localStorage.setItem(`cbt_device_${res.data.attempt_id}`, res.data.device_token);
      }
      navigate(`/ujian/exam/${res.data.attempt_id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuka latihan.');
      setPreview(null);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <p className="text-center text-sm text-ink-300 py-8">Memuat...</p>;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {dikelompokkan.map(([mapel, list]) => (
        <div key={mapel} className="surface-card p-4">
          <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">{mapel}</h2>
          <div className="space-y-2">
            {list.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 border border-line-200 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-ink-900 truncate">{l.nama}</p>
                  <p className="text-xs text-ink-500">
                    {l.jumlah_soal} soal{l.skor_terbaik !== null && <> &middot; skor terbaik <b className="text-brand-700">{l.skor_terbaik}</b></>}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(l)}
                  className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition shrink-0"
                >
                  {l.skor_terbaik !== null ? 'Latihan Lagi' : 'Mulai'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {dikelompokkan.length === 0 && (
        <p className="text-center text-sm text-ink-300 py-8">Belum ada latihan tersedia untuk kelasmu.</p>
      )}

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">Detail Latihan</h3>
              <button onClick={() => setPreview(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-ink-900">{preview.nama}</p>
                <p className="text-sm text-ink-500">{preview.mapel}</p>
              </div>
              <div className="bg-mist-50 rounded-lg px-3 py-2 flex items-center gap-2 w-fit">
                <ListChecks className="w-4 h-4 text-ink-400" />
                <div><p className="text-sm font-semibold text-ink-900">{preview.jumlah_soal}</p><p className="text-[10px] text-ink-500">Soal</p></div>
              </div>
              <ul className="text-xs text-ink-500 space-y-1.5 list-disc pl-4">
                <li>Waktu pengerjaan {preview.durasi_menit} menit, boleh dikerjakan berkali-kali.</li>
                <li>Pembahasan langsung tampil setelah dikumpulkan.</li>
                <li>Soal &amp; urutan pilihan jawaban acak tiap percobaan.</li>
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
