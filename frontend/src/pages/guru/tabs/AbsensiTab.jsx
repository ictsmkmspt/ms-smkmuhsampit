import { useState } from 'react';
import KehadiranSection from './absensi/KehadiranSection';
import SholatZuhurSection from './absensi/SholatZuhurSection';

export default function AbsensiTab() {
  const [subTab, setSubTab] = useState('kehadiran'); // 'kehadiran' | 'sholat'

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-0.5 w-fit">
          <button
            onClick={() => setSubTab('kehadiran')}
            className={`text-sm font-medium rounded-lg px-4 py-1.5 transition ${
              subTab === 'kehadiran' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
            }`}
          >
            Absensi Kehadiran
          </button>
          <button
            onClick={() => setSubTab('sholat')}
            className={`text-sm font-medium rounded-lg px-4 py-1.5 transition ${
              subTab === 'sholat' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
            }`}
          >
            Absen Sholat Zuhur
          </button>
        </div>
      </div>

      {subTab === 'kehadiran' ? <KehadiranSection /> : <SholatZuhurSection />}
    </div>
  );
}
