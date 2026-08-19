import { useEffect, useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import api from '../../../api/axios';

export default function IdukaPenilaianTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSiswa = () => {
    setLoading(true);
    return api.get('/iduka/my-siswa').then((res) => setList(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadSiswa(); }, []);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-brand-500" />
        <h2 className="font-display font-semibold text-ink-900">Penilaian PKL</h2>
      </div>
      <p className="text-xs text-ink-500 mb-4">
        Isi penilaian akhir untuk siswa magang di tempat Anda. Setelah dikirim, nilai masih bisa diedit atau dihapus lagi kalau ada yang perlu diperbaiki — selama PKL siswa belum ditandai selesai oleh sekolah.
      </p>

      {loading ? (
        <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => window.open(`/print/penilaian-pkl/${p.id}`, '_blank')}
              className="w-full flex items-center justify-between border border-line-200 rounded-lg px-3 py-2.5 text-sm hover:border-brand-300 hover:bg-brand-50/40 transition text-left"
            >
              <div>
                <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
              </div>
              {p.nilai_akhir != null ? (
                <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nilai: {p.nilai_akhir}
                </span>
              ) : (
                <span className="text-xs text-honey-700">Belum dinilai</span>
              )}
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-center text-ink-300 py-6 text-sm">Belum ada siswa magang di tempat Anda.</p>
          )}
        </div>
      )}
    </div>
  );
}
