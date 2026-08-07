import { useState } from 'react';
import { Home, CalendarClock, CalendarRange } from 'lucide-react';
import LeaderboardPrestasi from '../../../components/LeaderboardPrestasi';
import KalenderAkademikView from '../../../components/KalenderAkademikView';
import JadwalPelajaranView from '../../../components/JadwalPelajaranView';

// Sub-menu di atas konten, gaya sama dengan sub-menu Ortu (pill putih rata
// tengah, label pendek di HP) — 3 tab sejajar: Beranda (leaderboard),
// Jadwal Pelajaran, dan Kalender Akademik, bukan digabung 1 scroll panjang.
const SUB_TABS = [
  { key: 'beranda', label: 'Beranda', labelShort: 'Beranda', icon: Home },
  { key: 'jadwal', label: 'Jadwal Pelajaran', labelShort: 'Jadwal', icon: CalendarClock },
  { key: 'kalender', label: 'Kalender Akademik', labelShort: 'Kalender', icon: CalendarRange },
];

export default function BerandaTab() {
  const [activeTab, setActiveTab] = useState('beranda');

  return (
    <div>
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto">
        {SUB_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">{t.labelShort}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'beranda' && <LeaderboardPrestasi />}

      {activeTab === 'jadwal' && (
        <div className="surface-card p-4">
          <h2 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ink-500" /> Jadwal Mengajar
          </h2>
          <JadwalPelajaranView endpoint="/my-teaching-schedule" showClass />
        </div>
      )}

      {activeTab === 'kalender' && <KalenderAkademikView />}
    </div>
  );
}
