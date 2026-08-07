import { useState } from 'react';
import KehadiranSection from './absensi/KehadiranSection';
import SholatZuhurSection from './absensi/SholatZuhurSection';
import PoinPrestasiSection from './poin/PoinPrestasiSection';
import PoinPelanggaranSection from './poin/PoinPelanggaranSection';

// Gabungan Absensi + Poin di 1 tab "Scan" (tombol tengah navbar bawah) —
// submenu-nya pakai gaya yang sama dengan sub-menu Ortu (pill putih rata
// tengah, label pendek di HP), bukan pill sederhana yang dipakai sebelumnya.
const SCAN_SUBMENU = [
  { key: 'kehadiran', label: 'Absensi Kehadiran', labelShort: 'Kehadiran', component: KehadiranSection },
  { key: 'sholat', label: 'Absensi Sholat Zuhur', labelShort: 'Sholat Zuhur', component: SholatZuhurSection },
  { key: 'prestasi', label: 'Poin Prestasi', labelShort: 'Prestasi', component: PoinPrestasiSection },
  { key: 'pelanggaran', label: 'Poin Pelanggaran', labelShort: 'Pelanggaran', component: PoinPelanggaranSection },
];

export default function ScanTab() {
  const [active, setActive] = useState('kehadiran');
  const section = SCAN_SUBMENU.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex flex-wrap gap-1 justify-center bg-white border border-line-200 rounded-xl p-1 mb-6 w-fit mx-auto">
        {SCAN_SUBMENU.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <span className="sm:hidden">{s.labelShort}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
