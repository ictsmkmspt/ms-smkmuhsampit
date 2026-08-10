import { useState } from 'react';
import { ClipboardCheck, AlertTriangle, HeartHandshake } from 'lucide-react';
import AttendanceReportTab from '../../admin/tabs/AttendanceReportTab';
import ViolationReportTab from '../../admin/tabs/ViolationReportTab';
import SanksiCatatanSection from './laporan/SanksiCatatanSection';

// Sub-menu Laporan BK — sama pola pill sub-menu seperti Laporan Wali Kelas
// (guru/tabs/LaporanTab.jsx), tapi pakai komponen Rekap Admin/Waka
// langsung (AttendanceReportTab/ViolationReportTab) karena semuanya sudah
// punya filter Kelas + "Semua Kelas" bawaan — BK TIDAK dibatasi 1 kelas
// seperti wali kelas, jadi tidak perlu versi khusus. Tombol edit/hapus di
// komponen-komponen itu otomatis tersembunyi untuk BK (dikunci ke role
// 'admin' di masing-masing file). BK sengaja ditaruh paling awal (bukan
// Prestasi, yang di luar cakupan kerja BK).
const SECTIONS = [
  { key: 'bk', label: 'BK', icon: HeartHandshake, component: SanksiCatatanSection },
  { key: 'absensi', label: 'Absensi', icon: ClipboardCheck, component: AttendanceReportTab },
  { key: 'poin', label: 'Pelanggaran', icon: AlertTriangle, component: ViolationReportTab },
];

export default function LaporanBkTab() {
  const [active, setActive] = useState('bk');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto">
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
