import { useEffect, useRef, useState } from 'react';
import { LogOut, HeartHandshake, AlertTriangle, NotebookPen, FileBarChart, ChevronDown, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { TahunAjaranProvider } from '../../context/TahunAjaranContext';
import SanksiSiswaTab from './tabs/SanksiSiswaTab';
import CatatanBkTab from './tabs/CatatanBkTab';
import LaporanBkTab from './tabs/LaporanBkTab';
import NotificationBell from '../../components/NotificationBell';
import EditProfileModal from '../../components/EditProfileModal';

const TABS = [
  { key: 'sanksi', label: 'Sanksi Siswa', icon: AlertTriangle },
  { key: 'catatan', label: 'Catatan BK', icon: NotebookPen },
  { key: 'laporan', label: 'Laporan', icon: FileBarChart },
];

export default function BkDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('sanksi');
  const [prefillKejadian, setPrefillKejadian] = useState(null);
  const [tahunAjaranAktif, setTahunAjaranAktif] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get('/tahun-ajaran').then((res) => {
      setTahunAjaranAktif(res.data.find((t) => t.status === 'aktif') || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bukaCatatTindakLanjut = (kejadian) => {
    setPrefillKejadian(kejadian);
    setActiveTab('catatan');
  };

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60">
                Bimbingan Konseling{tahunAjaranAktif && <> &middot; TA {tahunAjaranAktif.nama}</>}
              </p>
              <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold text-white hover:text-[#F2B705] transition"
            >
              Profil
              <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 surface-card overflow-hidden">
                <button
                  onClick={() => { setShowEditProfil(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <UserCog className="w-4 h-4" /> Edit Profil
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            )}
          </div>
          <NotificationBell />
          </div>
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {activeTab === 'sanksi' && <SanksiSiswaTab onCatatTindakLanjut={bukaCatatTindakLanjut} />}
        {activeTab === 'catatan' && (
          <CatatanBkTab prefill={prefillKejadian} onPrefillUsed={() => setPrefillKejadian(null)} />
        )}
        {activeTab === 'laporan' && (
          // Sub-tab Pelanggaran & Prestasi di LaporanBkTab reuse komponen
          // Admin (ViolationReportTab/AchievementReportTab) yang butuh
          // TahunAjaranContext — dibungkus di sini (bukan di seluruh
          // dashboard) supaya tidak fetch /tahun-ajaran kalau BK sedang di
          // tab lain. Tanpa selektor tahun ajaran di UI, context ini
          // otomatis selalu berperilaku "tahun aktif" (lihat
          // TahunAjaranContext.jsx: selectedId kosong = isAktif true).
          <TahunAjaranProvider>
            <LaporanBkTab />
          </TahunAjaranProvider>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-brand-600' : 'text-ink-400'}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
