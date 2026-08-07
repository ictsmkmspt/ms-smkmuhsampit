import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: "Jum'at", sabtu: 'Sabtu' };

// Tampilan jadwal, baca-saja — dipakai Siswa (endpoint /my-schedule), Wali
// (endpoint /my-children/{id}/schedule), dan Guru (endpoint
// /my-teaching-schedule, dengan showClass supaya baris kedua tampilkan nama
// kelas, bukan nama guru — soalnya guru sendiri sudah tahu dia gurunya,
// yang perlu ditahu justru kelas mana yang diajar di jam itu, karena
// jadwalnya bisa merentang beberapa kelas berbeda). Nama mapel & guru/kelas
// langsung ditulis di barisnya masing-masing, jam kosong (tanpa isian)
// disembunyikan supaya daftarnya tidak panjang.
export default function JadwalPelajaranView({ endpoint, showClass = false }) {
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

  const scheduleByPeriod = useMemo(() => {
    const map = {};
    schedules.forEach((s) => { map[s.period_id] = s; });
    return map;
  }, [schedules]);

  const barisHariIni = useMemo(() => {
    return periods
      .filter((p) => p.hari === hari)
      .map((p) => ({ period: p, jadwal: scheduleByPeriod[p.id] }))
      .filter(({ period, jadwal }) => period.tipe === 'khusus' || jadwal);
  }, [periods, hari, scheduleByPeriod]);

  if (loading) return <p className="text-center text-ink-300 py-6 text-sm">Memuat jadwal...</p>;
  if (error) return <p className="text-center text-honey-700 py-6 text-sm">{error}</p>;

  return (
    <div className="space-y-3">
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

      {barisHariIni.length === 0 ? (
        <p className="text-center text-ink-300 py-4 text-sm">Belum ada jadwal untuk hari ini.</p>
      ) : (
        <ul className="divide-y divide-line-200">
          {barisHariIni.map(({ period: p, jadwal }) => (
            <li key={p.id} className="py-2 flex items-center gap-3">
              <p className="text-xs text-ink-500 shrink-0 w-[4.5rem]">{p.waktu_mulai?.slice(0, 5)}–{p.waktu_selesai?.slice(0, 5)}</p>
              {p.tipe === 'khusus' ? (
                <p className="text-sm font-medium text-ink-700 min-w-0">{p.label_khusus}</p>
              ) : (
                <p className="text-sm text-ink-900 min-w-0">
                  <span className="font-medium">{jadwal.subject?.nama || '-'}</span>
                  <span className="text-ink-500"> — {showClass ? (jadwal.class_room?.name || '-') : (jadwal.teacher?.user?.name || '-')}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
