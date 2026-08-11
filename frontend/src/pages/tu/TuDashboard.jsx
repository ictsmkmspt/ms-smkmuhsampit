import { useState } from 'react';
import { LogOut, LayoutDashboard, Receipt, Wallet, GraduationCap, Settings, Menu, X, Pencil, FileBarChart, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import DashboardTab from './tabs/DashboardTab';
import TagihanTab from './tabs/TagihanTab';
import TagihanLainTab from './tabs/TagihanLainTab';
import AlumniTab from './tabs/AlumniTab';
import LaporanTab from './tabs/LaporanTab';
import PengaturanTab from './tabs/PengaturanTab';
import EditProfileModal from '../../components/EditProfileModal';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: DashboardTab },
  { key: 'tagihan', label: 'Tagihan SPP', icon: Receipt, component: TagihanTab },
  { key: 'tagihan-lain', label: 'Tagihan Lain', icon: Wallet, component: TagihanLainTab },
  { key: 'laporan', label: 'Laporan', icon: FileBarChart, component: LaporanTab },
  { key: 'alumni', label: 'Alumni', icon: GraduationCap, component: AlumniTab },
  { key: 'pengaturan', label: 'Pengaturan', icon: Settings, component: PengaturanTab },
];

// Sub-menu dropdown khusus nav "Laporan" — cuma 1 item yang butuh dropdown
// jadi tidak digeneralisasi ke semua TABS (beda dengan pola dropdown navbar
// atas di AdminDashboard yang punya banyak menu bertingkat).
const LAPORAN_SUBMENU = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'perorangan', label: 'Perorangan' },
];

export default function TuDashboard() {
  const { user, logout } = useAuth();
  const { profile } = useSchoolProfile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeLaporanSub, setActiveLaporanSub] = useState('ringkasan');
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const navItems = () => TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.key;

    if (tab.key === 'laporan') {
      return (
        <div key={tab.key}>
          <button
            onClick={() => setLaporanOpen((v) => !v)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {tab.label}
            <ChevronDown className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${laporanOpen ? 'rotate-180' : ''}`} />
          </button>
          {laporanOpen && (
            <div className="mt-1 ml-6 space-y-0.5 border-l border-white/10 pl-3">
              {LAPORAN_SUBMENU.map((sub) => {
                const subActive = isActive && activeLaporanSub === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => { setActiveTab('laporan'); setActiveLaporanSub(sub.key); setMobileOpen(false); }}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition ${
                      subActive ? 'bg-white/10 text-[#F2B705]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={tab.key}
        onClick={() => { setActiveTab(tab.key); setMobileOpen(false); }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
          isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" /> {tab.label}
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-mist-50">
      {/* ===== Navbar atas — HP saja (md:hidden) ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0B1B3A] z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-8 h-8 rounded-full object-contain bg-white shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[#0B1B3A] text-[10px]">SM</span>
              </div>
            )}
            <p className="font-display font-bold text-white text-xs truncate">{profile.nama_sekolah.toUpperCase()}</p>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 px-3 py-3 space-y-1">
            {navItems()}
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

      {/* ===== Sidebar kiri — desktop saja (hidden md:flex) ===== */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[#0B1B3A] fixed left-0 top-0 bottom-0 flex-col z-30">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10 shrink-0">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt="Logo Sekolah" className="w-10 h-10 rounded-full object-contain bg-white shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-[#0B1B3A] text-xs">SM</span>
            </div>
          )}
          <div className="leading-tight min-w-0">
            <p className="font-display font-bold text-white text-xs tracking-wide">{profile.nama_sekolah}</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50">Tata Usaha</p>
            </div>
            <button
              onClick={() => setShowEditProfil(true)}
              title="Edit Profil"
              className="shrink-0 text-white/50 hover:text-[#F2B705] transition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems()}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
          >
            <LogOut className="w-4 h-4 shrink-0" /> Keluar
          </button>
        </div>
      </aside>

      {/* ===== Konten utama ===== */}
      <div className="mt-14 md:mt-0 md:ml-64">
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
          {activeTab === 'laporan' ? (
            <LaporanTab activeSub={activeLaporanSub} />
          ) : (
            ActiveComponent && <ActiveComponent />
          )}
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}
