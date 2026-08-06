import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: "Jum'at", sabtu: 'Sabtu' };

// Tampilan jadwal 1 kelas, baca-saja — dipakai Siswa (endpoint /my-schedule)
// dan Wali (endpoint /my-children/{id}/schedule). Tiap sel cuma tampilkan
// kode ringkas (sama seperti kode yang dipakai admin), dijelaskan lewat
// daftar "Keterangan Kode" di bawah supaya tidak perlu tap tiap sel.
export default function JadwalPelajaranView({ endpoint }) {
  const [periods, setPeriods] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hari, setHari] = useState('senin');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(endpoint)
      .then((res) => { setPeriods(res.data.periods); setSchedules(res.data.schedules); })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat jadwal.'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const periodsHariIni = periods.filter((p) => p.hari === hari);

  const scheduleByPeriod = useMemo(() => {
    const map = {};
    schedules.forEach((s) => { map[s.period_id] = s; });
    return map;
  }, [schedules]);

  const keterangan = useMemo(() => {
    const map = new Map();
    schedules.forEach((s) => {
      const kode = s.kode || s.subject?.kode || '?';
      if (!map.has(kode)) {
        map.set(kode, { kode, mapel: s.subject?.nama || '-', guru: s.teacher?.user?.name || '-' });
      }
    });
    return [...map.values()];
  }, [schedules]);

  if (loading) return <p className="text-center text-ink-300 py-6 text-sm">Memuat jadwal...</p>;
  if (error) return <p className="text-center text-honey-700 py-6 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {HARI.map((h) => (
          <button
            key={h}
            onClick={() => setHari(h)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              hari === h ? 'bg-brand-600 text-white' : 'bg-white border border-line-200 text-ink-600 hover:bg-mist-50'
            }`}
          >
            {HARI_LABEL[h]}
          </button>
        ))}
      </div>

      <div>
        {periodsHariIni.length === 0 && <p className="text-center text-ink-300 py-4 text-sm">Belum ada jam pelajaran untuk hari ini.</p>}
        <ul className="divide-y divide-line-200">
          {periodsHariIni.map((p) => {
            const jadwal = scheduleByPeriod[p.id];
            const kode = jadwal ? (jadwal.kode || jadwal.subject?.kode || '?') : null;
            return (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-500">{p.waktu_mulai?.slice(0, 5)}–{p.waktu_selesai?.slice(0, 5)}</p>
                  {p.tipe === 'khusus' ? (
                    <p className="text-sm font-medium text-ink-700">{p.label_khusus}</p>
                  ) : !jadwal ? (
                    <p className="text-sm text-ink-300">Jam kosong</p>
                  ) : null}
                </div>
                {p.tipe === 'pelajaran' && jadwal && (
                  <span className="badge-soft badge-brand shrink-0 font-mono">{kode}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {keterangan.length > 0 && (
        <div className="border-t border-line-200 pt-3">
          <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Keterangan Kode</h3>
          <ul className="space-y-1.5">
            {keterangan.map((k) => (
              <li key={k.kode} className="flex items-start gap-2 text-sm">
                <span className="badge-soft badge-brand font-mono shrink-0">{k.kode}</span>
                <span className="text-ink-700">{k.mapel} — {k.guru}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
