import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function SiswaDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const barcodeRef = useRef(null);

  useEffect(() => {
    api.get('/my-profile').then((res) => setProfile(res.data));
    api.get('/my-attendances').then((res) => setHistory(res.data));
  }, []);

  useEffect(() => {
    if (profile && barcodeRef.current) {
      JsBarcode(barcodeRef.current, profile.barcode_code, {
        format: 'CODE128',
        height: 50,
        width: 2,
        displayValue: true,
        background: 'transparent',
        lineColor: '#22344A',
        fontOptions: 'bold',
        fontSize: 13,
        margin: 0,
      });
    }
  }, [profile]);

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-mist-50 p-6">
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <div>
          <p className="text-xs text-ink-500">Siswa</p>
          <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </div>

      <div className="max-w-md mx-auto mb-6 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(34,52,74,0.08)] border border-line-200">
        <div className="bg-brand-600 px-5 pt-5 pb-7 text-white">
          <p className="text-[10px] uppercase tracking-widest text-brand-100 mb-3">Kartu Absensi Siswa</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center font-display font-semibold text-lg">
              {initial}
            </div>
            <div>
              <p className="font-display font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-brand-100">
                NIS {profile?.nis || '—'} · {profile?.class_room?.name || 'Belum ada kelas'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative bg-honey-50 h-0">
          <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-mist-50" />
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-mist-50" />
          <div className="absolute top-0 left-3 right-3 border-t-2 border-dashed border-honey-300" />
        </div>

        <div className="bg-honey-50 px-5 py-6 flex flex-col items-center">
          <svg ref={barcodeRef}></svg>
          <p className="text-[11px] text-ink-500 mt-2">Tunjukkan barcode ini ke guru saat absen</p>
        </div>
      </div>

      <div className="surface-card max-w-md mx-auto p-4">
        <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">Riwayat Absensi</h2>
        <ul className="divide-y divide-line-200">
          {history.map((h) => (
            <li key={h.id} className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-ink-700">{h.date}</span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-ink-500">
                  <Clock className="w-3.5 h-3.5" /> {h.time_in}
                </span>
                <span className={`badge-soft ${h.status === 'telat' ? 'badge-honey' : 'badge-brand'}`}>
                  {h.status}
                </span>
              </span>
            </li>
          ))}
          {history.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-300">Belum ada riwayat absensi.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
