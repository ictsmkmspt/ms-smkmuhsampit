import { useEffect, useState } from 'react';
import { Library, BookOpen, BookOpenCheck, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';
import PeminjamanTab from './PeminjamanTab';

export default function BerandaTab() {
  const [ringkasan, setRingkasan] = useState(null);

  useEffect(() => { api.get('/perpustakaan-ringkasan').then((res) => setRingkasan(res.data)); }, []);

  const kartu = ringkasan ? [
    { label: 'Judul Buku', nilai: ringkasan.total_judul, icon: Library, warna: 'text-ink-900' },
    { label: 'Eksemplar', nilai: ringkasan.total_eksemplar, icon: BookOpen, warna: 'text-ink-900' },
    { label: 'Tersedia', nilai: ringkasan.tersedia, icon: BookOpenCheck, warna: 'text-brand-600' },
    { label: 'Terlambat', nilai: ringkasan.terlambat, icon: AlertTriangle, warna: ringkasan.terlambat > 0 ? 'text-rose-700' : 'text-ink-900' },
  ] : [];

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-ink-900">Ringkasan Perpustakaan</h2>
      {ringkasan && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kartu.map((k) => (
            <div key={k.label} className="surface-card p-4 flex items-center gap-3">
              <k.icon className={`w-5 h-5 shrink-0 ${k.warna}`} />
              <div>
                <p className={`text-xl font-display font-bold leading-tight ${k.warna}`}>{k.nilai}</p>
                <p className="text-[11px] text-ink-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <PeminjamanTab />
    </div>
  );
}
