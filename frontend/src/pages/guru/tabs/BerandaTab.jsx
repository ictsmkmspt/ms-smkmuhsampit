import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import LeaderboardPrestasi from '../../../components/LeaderboardPrestasi';
import KalenderAkademikView from '../../../components/KalenderAkademikView';
import JadwalPelajaranView from '../../../components/JadwalPelajaranView';
import AnnouncementBoard from '../../../components/AnnouncementBoard';
import { PeminjamanSayaView, KatalogView } from '../../../components/PerpustakaanSelfServiceViews';

// Sub-menu di atas konten, gaya sama dengan sub-menu Ortu (pill putih rata
// tengah, label pendek di HP) — Beranda (pengumuman + leaderboard jadi 1
// tab, bukan dipisah lagi), Jadwal Pelajaran, Kalender Akademik, lalu
// Peminjaman Saya & Katalog perpus (guru bisa jadi peminjam buku juga,
// sama seperti siswa).
const SUB_TABS = [
  { key: 'beranda', label: 'Beranda', labelShort: 'Beranda' },
  { key: 'jadwal', label: 'Jadwal Pelajaran', labelShort: 'Jadwal' },
  { key: 'kalender', label: 'Kalender Akademik', labelShort: 'Kalender' },
  { key: 'peminjaman', label: 'Peminjaman Saya', labelShort: 'Pinjaman' },
  { key: 'katalog', label: 'Katalog Buku', labelShort: 'Katalog' },
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
              <span className="sm:hidden">{t.labelShort}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'beranda' && (
        <div className="space-y-4">
          <AnnouncementBoard canManage />
          <LeaderboardPrestasi />
        </div>
      )}

      {activeTab === 'jadwal' && (
        <div className="surface-card p-4">
          <h2 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ink-500" /> Jadwal Mengajar
          </h2>
          <JadwalPelajaranView endpoint="/my-teaching-schedule" showClass />
        </div>
      )}

      {activeTab === 'kalender' && <KalenderAkademikView />}

      {activeTab === 'peminjaman' && <PeminjamanSayaView />}

      {activeTab === 'katalog' && <KatalogView />}
    </div>
  );
}
