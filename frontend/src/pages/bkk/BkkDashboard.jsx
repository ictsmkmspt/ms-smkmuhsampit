import { useState } from 'react';
import { LogOut, Briefcase, Home, ClipboardList, Inbox, GraduationCap, Handshake, FileText, FileBarChart, Menu, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import NotificationBell from '../../components/NotificationBell';
import EditProfileModal from '../../components/EditProfileModal';
import BerandaBkkTab from './tabs/BerandaBkkTab';
import LokerVerifikasiTab from './tabs/LokerVerifikasiTab';
import LamaranMasukTab from './tabs/LamaranMasukTab';
import TracerStudyBkkTab from './tabs/TracerStudyBkkTab';
import MitraKerjasamaTab from './tabs/MitraKerjasamaTab';
import CetakDokumenTab from './tabs/CetakDokumenTab';
import LaporanPenempatanTab from './tabs/LaporanPenempatanTab';

const TABS = [
  { key: 'beranda', label: 'Beranda', icon: Home, component: BerandaBkkTab },
  { key: 'loker', label: 'Loker', icon: ClipboardList, component: LokerVerifikasiTab },
  { key: 'lamaran', label: 'Lamaran Masuk', icon: Inbox, component: LamaranMasukTab },
  { key: 'tracer', label: 'Tracer Study', icon: GraduationCap, component: TracerStudyBkkTab },
  { key: 'mitra', label: 'Mitra & Kerja Sama', icon: Handshake, component: MitraKerjasamaTab },
  { key: 'cetak', label: 'Cetak Dokumen', icon: FileText, component: CetakDokumenTab },
  { key: 'laporan', label: 'Laporan Penempatan', icon: FileBarChart, component: LaporanPenempatanTab },
];

/**
 * Dashboard Pengurus BKK (Bursa Kerja Khusus) — role terpisah dari Waka
 * Humas, sesuai rancangan desain-bkk.html bagian "Peta navigasi per peran".
 * Navbar SENGAJA di sidebar kiri, pola sama persis dengan AdminDashboard.jsx
 * (bisa dikecilkan di desktop, jadi dropdown di HP) — bukan tab horizontal
 * seperti dashboard Guru/BK, supaya konsisten dengan gaya "menu banyak" ala
 * admin (7 menu, lebih cocok sidebar daripada navbar bawah yang cuma pas
 * 3-4 ikon).
 */
export default function BkkDashboard() {
  const { user, logout } = useAuth();
  const { profile } = useSchoolProfile();
  const [activeTab, setActiveTab] = useState('beranda');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);

  const active = TABS.find((t) => t.key === activeTab) || TABS[0];
  const ActiveComponent = active.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const handleTabClick = (key) => {
    setActiveTab(key);
    setMobileOpen(false);
  };

  const navItems = (variant) => TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.key;
    const isCollapsed = variant === 'desktop' && collapsed;
    return (
      <button
        key={tab.key}
        onClick={() => handleTabClick(tab.key)}
        title={isCollapsed ? tab.label : undefined}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
          isCollapsed ? 'justify-center' : ''
        } ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
      >
        <Icon className="w-4 h-4 shrink-0" /> {!isCollapsed && tab.label}
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-mist-50">
      {/* ===== Navbar atas — HP saja ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0B1B3A] z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <p className="font-display font-bold text-white text-xs truncate">Bursa Kerja Khusus</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <NotificationBell />
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 px-3 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {navItems('mobile')}
            <div className="pt-2 mt-2 border-t border-white/10">
              <button
                onClick={() => { setShowEditProfil(true); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
              >
                <Pencil className="w-4 h-4" /> Edit Profil
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Sidebar kiri — desktop saja ===== */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-[#0B1B3A] fixed left-0 top-0 bottom-0 flex-col z-30 transition-all duration-200`}
      >
        <div className="relative">
          <div className={`px-5 py-5 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="font-display font-bold text-white text-xs tracking-wide">Bursa Kerja Khusus</p>
                {profile?.nama_sekolah && <p className="text-[11px] text-white/50 truncate">{profile.nama_sekolah}</p>}
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#F2B705] text-[#0B1B3A] flex items-center justify-center shadow hover:brightness-95 transition"
            title={collapsed ? 'Perbesar sidebar' : 'Perkecil sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className={`px-5 py-4 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/50">Pengurus BKK</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowEditProfil(true)}
                  title="Edit Profil"
                  className="text-white/50 hover:text-[#F2B705] transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <NotificationBell />
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems('desktop')}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            title={collapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" /> {!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* ===== Konten utama ===== */}
      <div className={`mt-14 md:mt-0 ${collapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-200`}>
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
          <ActiveComponent />
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}
