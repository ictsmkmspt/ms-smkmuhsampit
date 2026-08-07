import { useEffect, useRef, useState } from 'react';
import { LogOut, FileText, Briefcase, ChevronDown, UserCog, Home, ClipboardList, QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BerandaTab from './tabs/BerandaTab';
import NilaiTab from './tabs/NilaiTab';
import ScanTab from './tabs/ScanTab';
import LaporanTab from './tabs/LaporanTab';
import BimbinganPklTab from './tabs/BimbinganPklTab';
import EditProfileModal from '../../components/EditProfileModal';

// Urutan navbar bawah: Beranda & Nilai di kiri tombol Scan (tengah,
// melayang), PKL & Laporan di kanan — Absensi dan Poin digabung jadi 1
// tombol "Scan" di tengah (submenunya ada di dalam ScanTab: Kehadiran,
// Sholat Zuhur, Poin Prestasi, Poin Pelanggaran). Slot "CBT" (rancangan
// ujian online) ditunda dulu — dipakai lebih dulu untuk Nilai (input nilai
// manual per mapel, mis. PR/ulangan harian) yang lebih sederhana & segera
// dibutuhkan.
const ALL_TABS = [
  { key: 'beranda', label: 'Beranda', icon: Home,          component: BerandaTab },
  { key: 'nilai',   label: 'Nilai',   icon: ClipboardList, component: NilaiTab },
  { key: 'scan',    label: 'Scan',    icon: QrCode,        component: ScanTab },
  { key: 'pkl',     label: 'PKL',     icon: Briefcase,      component: BimbinganPklTab },
  { key: 'laporan', label: 'Laporan', icon: FileText,       component: LaporanTab },
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

  // Laporan & PKL sekarang tampil untuk SEMUA guru, bukan cuma wali kelas /
  // pembimbing PKL — kalau tidak berlaku buat guru itu, halamannya sendiri
  // sudah otomatis menampilkan pesan "belum ditugaskan" (bukan error/bocor
  // data), jadi aman ditampilkan ke semua.
  const TABS = ALL_TABS;
  // Navbar bawah: Beranda/CBT selalu di kiri, PKL/Laporan di kanan, tombol
  // Scan melayang di tengah — dipisah di sini supaya kedua sisi tetap
  // seimbang (pakai flex-1 masing-masing).
  const leftTabs = TABS.filter((t) => t.key === 'beranda' || t.key === 'nilai');
  const rightTabs = TABS.filter((t) => t.key === 'pkl' || t.key === 'laporan');

  useEffect(() => {
    if (!TABS.find((t) => t.key === activeTab)) {
      setActiveTab('beranda');
    }
  }, [TABS, activeTab]);

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

      {/* Bottom navbar — Beranda/CBT kiri, Scan melayang di tengah, PKL/Laporan kanan */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="relative bg-white border-t border-line-200">
          <div className="max-w-4xl mx-auto flex items-stretch">
            <div className="flex-1 flex">
              {leftTabs.map((tab) => (
                <SideTabButton key={tab.key} tab={tab} isActive={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
              ))}
            </div>
            <div className="w-20 shrink-0" aria-hidden="true" />
            <div className="flex-1 flex">
              {rightTabs.map((tab) => (
                <SideTabButton key={tab.key} tab={tab} isActive={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('scan')}
            title="Scan QR Code"
            className={`absolute left-1/2 -translate-x-1/2 -top-4 w-16 h-16 rounded-full flex flex-col items-center justify-center gap-0.5 shadow-lg transition ${
              activeTab === 'scan' ? 'bg-brand-700 ring-4 ring-brand-100' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            <QrCode className="w-6 h-6 text-white" />
            <span className="text-[9px] font-semibold text-white leading-none tracking-wide">Scan</span>
          </button>
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}

function SideTabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
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
}
