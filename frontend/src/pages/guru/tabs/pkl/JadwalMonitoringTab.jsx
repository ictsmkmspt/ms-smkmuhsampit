import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import api from '../../../../api/axios';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Jadwal Monitoring PKL — GLOBAL, dibuat admin/waka_kurikulum (menu admin
 * PKL > Jadwal Monitoring), berlaku untuk semua guru. Di sisi guru ini
 * murni tampilan baca (tidak ada tambah/edit/hapus).
 */
export default function JadwalMonitoringTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const today = hariIniIso();

  useEffect(() => {
    setLoading(true);
    api.get('/pkl-monitoring-jadwal').then((res) => setList(res.data)).finally(() => setLoading(false));
  }, []);

  const statusFor = (j) => {
    const selesai = j.tanggal_selesai || j.tanggal_rencana;
    if (selesai < today) return { label: 'Sudah lewat', badge: 'badge-rose' };
    if (j.tanggal_rencana <= today && today <= selesai) return { label: 'Berlangsung', badge: 'badge-brand' };
    return { label: 'Akan datang', badge: 'badge-honey' };
  };

  return (
    <div className="surface-card p-5">
      <h2 className="font-display font-semibold text-ink-900 mb-1 flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-ink-500" /> Jadwal Monitoring
      </h2>
      <p className="text-xs text-ink-500 mb-4">Jadwal monitoring PKL yang ditetapkan admin/Waka Kurikulum, berlaku untuk semua guru pembimbing.</p>

      {loading ? (
        <p className="text-center text-ink-300 py-6">Memuat...</p>
      ) : list.length === 0 ? (
        <p className="text-center text-ink-300 py-6 text-sm">Belum ada jadwal monitoring yang ditetapkan.</p>
      ) : (
        <ul className="divide-y divide-line-200">
          {list.map((j) => {
            const status = statusFor(j);
            return (
              <li key={j.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{j.judul}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {j.tanggal_rencana}{j.tanggal_selesai && j.tanggal_selesai !== j.tanggal_rencana ? ` s/d ${j.tanggal_selesai}` : ''}
                  </p>
                  {j.catatan && <p className="text-xs text-ink-500 mt-1">{j.catatan}</p>}
                </div>
                <span className={`badge-soft ${status.badge} shrink-0`}>{status.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
