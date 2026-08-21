import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

export default function NilaiSiswaTab() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/my-cbt-attempts').then((res) => setAttempts(res.data)).finally(() => setLoading(false));
  }, []);

  // Cuma ujian resmi (bukan latihan) — nilai latihan sengaja tidak masuk
  // rekap resmi, cukup dilihat di tab Latihan lewat "skor terbaik".
  const riwayat = useMemo(
    () => attempts.filter((a) => a.status === 'submitted' && a.exam?.tipe === 'ujian'),
    [attempts]
  );

  if (loading) return <p className="text-center text-sm text-ink-300 py-8">Memuat...</p>;

  return (
    <div className="max-w-md mx-auto surface-card p-4">
      <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">Riwayat Nilai Ujian</h2>
      <ul className="divide-y divide-line-200">
        {riwayat.map((a) => (
          <li key={a.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="text-ink-900 truncate">{a.exam?.nama}</p>
              <p className="text-xs text-ink-500">{a.exam?.subject?.nama}</p>
            </div>
            {a.skor != null ? (
              <span className="font-display font-semibold text-ink-900 shrink-0">{a.skor}</span>
            ) : (
              <span className="badge-soft bg-honey-50 text-honey-700 border border-honey-200 shrink-0">Menunggu publikasi</span>
            )}
          </li>
        ))}
        {riwayat.length === 0 && (
          <li className="py-4 text-center text-sm text-ink-300">Belum ada ujian yang selesai dikerjakan.</li>
        )}
      </ul>
    </div>
  );
}
