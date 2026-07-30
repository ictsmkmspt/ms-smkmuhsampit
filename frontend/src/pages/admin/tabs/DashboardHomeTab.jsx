import { useEffect, useState } from 'react';
import { Users, GraduationCap, School, Building2, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';

const STAT_DEFS = [
  { key: 'siswa', label: 'Total Siswa', icon: Users, color: '#0B1B3A' },
  { key: 'guru', label: 'Total Guru', icon: GraduationCap, color: '#15803D' },
  { key: 'kelas', label: 'Total Kelas', icon: School, color: '#F2B705' },
  { key: 'dudi', label: 'Total DUDI', icon: Building2, color: '#3FB27F' },
];

export default function DashboardHomeTab() {
  const [stats, setStats] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sumber = {
      siswa: () => api.get('/students').then((r) => r.data.length),
      guru:  () => api.get('/teachers').then((r) => r.data.length),
      kelas: () => api.get('/classes').then((r) => r.data.length),
      dudi:  () => api.get('/dudi').then((r) => r.data.length),
    };

    const entries = Object.entries(sumber);

    Promise.allSettled(entries.map(([, fn]) => fn())).then((hasil) => {
      const nilai = {};
      const gagal = {};
      hasil.forEach((r, i) => {
        const key = entries[i][0];
        if (r.status === 'fulfilled') {
          nilai[key] = r.value;
        } else {
          gagal[key] = r.reason?.response?.data?.message || r.reason?.message || 'Gagal memuat.';
          console.error(`Dashboard: gagal ambil data "${key}"`, r.reason);
        }
      });
      setStats(nilai);
      setErrors(gagal);
      setLoading(false);
    });
  }, []);

  const adaError = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
        <p className="text-sm text-ink-500 mt-1">Gambaran umum data sekolah saat ini.</p>
      </div>

      {adaError && (
        <div className="surface-card p-4 border-l-4 border-l-honey-400 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
          <div className="text-sm text-ink-700">
            <p className="font-medium mb-1">Sebagian data gagal dimuat:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.entries(errors).map(([key, msg]) => (
                <li key={key}>
                  <span className="font-medium">{STAT_DEFS.find((s) => s.key === key)?.label || key}</span>: {msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_DEFS.map((s) => {
          const Icon = s.icon;
          const gagalAmbil = errors[s.key] !== undefined;
          const value = loading ? '—' : gagalAmbil ? '!' : (stats[s.key] ?? 0);
          return (
            <div key={s.key} className="surface-card p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${s.color}1A` }}
              >
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
              <p className="text-xs text-ink-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card p-5 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Selamat datang di panel admin. Gunakan menu di samping untuk mengelola data siswa, guru, kelas, wali murid, laporan absensi/poin, penempatan PKL, dan pengaturan sistem.
        </p>
      </div>
    </div>
  );
}
