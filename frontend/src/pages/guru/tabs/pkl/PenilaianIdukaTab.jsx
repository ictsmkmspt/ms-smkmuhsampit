import { useEffect, useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import api from '../../../../api/axios';

export default function PenilaianIdukaTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/pkl-placements/my-bimbingan').then((res) => setList(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-brand-500" />
        <h2 className="font-display font-semibold text-ink-900">Penilaian PKL dari IDUKA</h2>
      </div>
      <p className="text-xs text-ink-500 mb-4">
        Pantauan hasil penilaian akhir siswa bimbingan Anda dari IDUKA tempat magang masing-masing.
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
                <p className="text-xs text-ink-500">{p.iduka?.nama_perusahaan}</p>
              </div>
              {p.nilai_akhir != null ? (
                <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nilai: {p.nilai_akhir}
                </span>
              ) : (
                <span className="text-xs text-ink-400">Belum dinilai IDUKA</span>
              )}
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-center text-ink-300 py-6 text-sm">Belum ada siswa bimbingan PKL.</p>
          )}
        </div>
      )}
    </div>
  );
}
