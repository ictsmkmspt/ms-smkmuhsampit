import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import api from '../api/axios';

const MEDALI = ['🥇', '🥈', '🥉'];

/**
 * Leaderboard 10 siswa poin prestasi tertinggi — dipakai bersama di beranda
 * Guru, Siswa, dan Wali. Nama peringkat 1 sengaja dibuat lebih besar dari
 * yang lain, makin ke bawah makin kecil (efek "podium").
 */
export default function LeaderboardPrestasi() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/leaderboard/prestasi').then((res) => setData(res.data));
  }, []);

  const ukuranNama = (rank) => {
    if (rank === 1) return 'text-lg font-bold';
    if (rank === 2) return 'text-base font-semibold';
    if (rank === 3) return 'text-[15px] font-semibold';
    return 'text-sm font-medium';
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-honey-500" />
        <h2 className="font-display font-semibold text-ink-900">Leaderboard Poin Prestasi</h2>
      </div>

      {data === null ? (
        <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-ink-300 py-6 text-sm">Belum ada data poin prestasi.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((s, i) => {
            const rank = i + 1;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  rank === 1 ? 'bg-honey-50 border border-honey-200' : 'bg-mist-50'
                }`}
              >
                <span className={`w-7 text-center shrink-0 ${rank <= 3 ? 'text-xl' : 'text-sm font-medium text-ink-400'}`}>
                  {MEDALI[rank - 1] || rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-ink-900 truncate leading-tight ${ukuranNama(rank)}`}>
                    {s.user?.name}
                  </p>
                  <p className="text-xs text-ink-500">{s.class_room?.name || '-'}</p>
                </div>
                <span className="font-display font-bold text-brand-700 shrink-0">
                  {s.total_prestasi}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
