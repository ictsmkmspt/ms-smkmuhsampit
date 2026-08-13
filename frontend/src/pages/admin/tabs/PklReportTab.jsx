import { useState } from 'react';
import { Users, GraduationCap } from 'lucide-react';
import KegiatanSiswaReportTab from './pkl-laporan/KegiatanSiswaReportTab';
import MonitoringGuruReportTab from './pkl-laporan/MonitoringGuruReportTab';

// Sub-menu Laporan PKL — sama pola pill sub-menu seperti Laporan BK
// (bk/tabs/LaporanBkTab.jsx). Kegiatan Siswa = absensi & nilai PKL per
// penempatan IDUKA, Monitoring Guru = jurnal kunjungan/bimbingan per guru
// pendamping PKL.
const SECTIONS = [
  { key: 'kegiatan', label: 'Kegiatan Siswa', icon: Users, component: KegiatanSiswaReportTab },
  { key: 'monitoring', label: 'Monitoring Guru', icon: GraduationCap, component: MonitoringGuruReportTab },
];

export default function PklReportTab() {
  const [active, setActive] = useState('kegiatan');
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
