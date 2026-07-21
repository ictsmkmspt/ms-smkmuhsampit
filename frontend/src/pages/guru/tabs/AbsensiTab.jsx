import { useState } from 'react';
import { ClipboardCheck, HandHeart } from 'lucide-react';
import KehadiranSection from './absensi/KehadiranSection';
import SholatZuhurSection from './absensi/SholatZuhurSection';

export default function AbsensiTab() {
  const [subTab, setSubTab] = useState('kehadiran'); // 'kehadiran' | 'sholat'

  return (
    <div>
      <div className="max-w-2xl mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setSubTab('kehadiran')}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium rounded-xl py-2.5 transition border ${
            subTab === 'kehadiran'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-ink-500 border-line-200 hover:bg-mist-50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Absensi Kehadiran
        </button>
        <button
          onClick={() => setSubTab('sholat')}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium rounded-xl py-2.5 transition border ${
            subTab === 'sholat'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-ink-500 border-line-200 hover:bg-mist-50'
          }`}
        >
          <HandHeart className="w-4 h-4" /> Absen Sholat Zuhur
        </button>
      </div>

      {subTab === 'kehadiran' ? <KehadiranSection /> : <SholatZuhurSection />}
    </div>
  );
}
