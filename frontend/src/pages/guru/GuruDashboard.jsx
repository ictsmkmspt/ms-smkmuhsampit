import { useEffect, useRef, useState } from 'react';
import { LogOut, ClipboardCheck, AlertTriangle, FileText, Briefcase, ChevronDown, UserCog, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BerandaTab from './tabs/BerandaTab';
import AbsensiTab from './tabs/AbsensiTab';
import PoinPelanggaranTab from './tabs/PoinPelanggaranTab';
import LaporanTab from './tabs/LaporanTab';
import BimbinganPklTab from './tabs/BimbinganPklTab';
import EditProfileModal from '../../components/EditProfileModal';

const TABS = [
  { key: 'beranda', label: 'Beranda',          icon: Home,           component: BerandaTab },
  { key: 'absensi', label: 'Absensi',          icon: ClipboardCheck, component: AbsensiTab },
  { key: 'poin',    label: 'Poin',  icon: AlertTriangle,  component: PoinPelanggaranTab },
  { key: 'pkl',     label: 'PKL',               icon: Briefcase,      component: BimbinganPklTab },
  { key: 'laporan', label: 'Laporan',           icon: FileText,       component: LaporanTab },
];

export default function GuruDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('beranda');

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      {/* Header */}
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div>
            <p className="text-xs text-white/60">Guru</p>
            <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
          </div>

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
        </div>
      </div>

      {/* Konten tab */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Bottom navbar ala Instagram */}
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
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}
