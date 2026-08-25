import { useEffect, useState } from 'react';
import { ClipboardList, Briefcase, Inbox, UserX } from 'lucide-react';
import api from '../../../api/axios';

const KARTU = [
  { key: 'loker_menunggu_verifikasi', label: 'Loker Menunggu Verifikasi', icon: ClipboardList, color: '#F2B705' },
  { key: 'loker_aktif', label: 'Loker Aktif', icon: Briefcase, color: '#15803D' },
  { key: 'lamaran_baru', label: 'Lamaran Baru', icon: Inbox, color: '#2a78d6' },
  { key: 'alumni_belum_tracer', label: 'Alumni Belum Isi Tracer Study', icon: UserX, color: '#B9504F' },
];

export default function BerandaBkkTab({ onNavigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/bkk/beranda').then((res) => setStats(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {KARTU.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.key} className="surface-card p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${k.color}1A` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: k.color }} />
              </div>
              <p className="font-display text-2xl font-bold text-ink-900">{stats ? stats[k.key] : '-'}</p>
              <p className="text-xs text-ink-500 mt-0.5 leading-snug">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Beranda ringkasan kerja Bursa Kerja Khusus (BKK). Verifikasi loker yang menunggu lewat menu <b>Loker</b>, tindak lanjuti lamaran baru lewat menu <b>Lamaran Masuk</b>, dan pantau alumni yang belum isi survei lewat menu <b>Tracer Study</b>.
        </p>
      </div>
    </div>
  );
}
