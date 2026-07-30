import { useState } from 'react';
import {
  LogOut, Database, ClipboardList, Settings, ChevronDown, ChevronLeft, ChevronRight, Menu, X,
  Users, GraduationCap, School, UserCog, Briefcase, LayoutDashboard, Building2, ClipboardCheck,
  Clock, AlertOctagon, Trophy, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MasterDataTab, { MASTER_DATA_SUBMENU } from './tabs/MasterDataTab';
import ReportTab, { REPORT_SUBMENU } from './tabs/ReportTab';
import SettingsTab, { SETTINGS_SUBMENU } from './tabs/SettingsTab';
import PklTab, { PKL_SUBMENU } from './tabs/PklTab';
import DashboardHomeTab from './tabs/DashboardHomeTab';

const MASTER_ICONS = { siswa: Users, guru: GraduationCap, kelas: School, wali: UserCog };
const SETTINGS_ICONS = { jam: Clock, poin: AlertOctagon, prestasi: Trophy, libur: CalendarDays };
const PKL_ICONS = { dudi: Building2, penempatan: ClipboardList };
const REPORT_ICONS = { absensi: ClipboardCheck, poin: AlertOctagon, prestasi: Trophy };

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, component: DashboardHomeTab },
  { key: 'master',     label: 'Master Data', icon: Database,        hasDropdown: true, submenu: MASTER_DATA_SUBMENU, subIcons: MASTER_ICONS },
  { key: 'laporan',    label: 'Laporan',     icon: ClipboardList,   hasDropdown: true, submenu: REPORT_SUBMENU, subIcons: REPORT_ICONS },
  { key: 'pkl',        label: 'PKL',         icon: Briefcase,       hasDropdown: true, submenu: PKL_SUBMENU, subIcons: PKL_ICONS },
  { key: 'pengaturan', label: 'Pengaturan',  icon: Settings,        hasDropdown: true, submenu: SETTINGS_SUBMENU, subIcons: SETTINGS_ICONS },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMasterSub, setActiveMasterSub] = useState('siswa');
  const [activeSettingsSub, setActiveSettingsSub] = useState('jam');
  const [activePklSub, setActivePklSub] = useState('dudi');
  const [activeReportSub, setActiveReportSub] = useState('absensi');
  const [openDropdown, setOpenDropdown] = useState(null); // 'master' | 'pengaturan' | null
  const [collapsed, setCollapsed] = useState(false); // toggle sidebar desktop
  const [mobileOpen, setMobileOpen] = useState(false); // toggle dropdown menu di HP

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  // Tiap tab yang punya dropdown (Master Data, Pengaturan) punya "sub aktif"
  // masing-masing sendiri, disimpan terpisah supaya tidak saling menimpa.
  const subStateFor = (key) => {
    if (key === 'master') return [activeMasterSub, setActiveMasterSub];
    if (key === 'pengaturan') return [activeSettingsSub, setActiveSettingsSub];
    if (key === 'pkl') return [activePklSub, setActivePklSub];
    if (key === 'laporan') return [activeReportSub, setActiveReportSub];
    return [null, () => {}];
  };

  const handleTabClick = (tab) => {
    if (collapsed) setCollapsed(false);
    if (tab.hasDropdown) {
      // Klik nama menunya cuma buka/tutup dropdown — belum langsung pindah
      // konten. Kontennya baru aktif setelah salah satu sub-menu dipilih.
      setOpenDropdown((prev) => (prev === tab.key ? null : tab.key));
    } else {
      setActiveTab(tab.key);
      setMobileOpen(false);
    }
  };

  const navItems = (variant) => TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.key;
    const isCollapsed = variant === 'desktop' && collapsed;

    if (tab.hasDropdown) {
      const isOpen = openDropdown === tab.key;
      const [activeSub, setActiveSub] = subStateFor(tab.key);

      return (
        <div key={tab.key}>
          <button
            onClick={() => handleTabClick(tab)}
            title={isCollapsed ? tab.label : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } ${isActive || isOpen ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
          >
            <span className="flex items-center gap-2"><Icon className="w-4 h-4 shrink-0" /> {!isCollapsed && tab.label}</span>
            {!isCollapsed && (
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {!isCollapsed && isOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
              {tab.submenu.map((sub) => {
                const SubIcon = tab.subIcons[sub.key];
                const subActive = activeTab === tab.key && activeSub === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => { setActiveSub(sub.key); setActiveTab(tab.key); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition ${
                      subActive ? 'text-[#F2B705] font-medium' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" /> {sub.label}
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
        onClick={() => handleTabClick(tab)}
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
      {/* ===== Navbar atas — HP saja (md:hidden) ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0B1B3A] z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-[#0B1B3A] text-[10px]">SM</span>
            </div>
            <p className="font-display font-bold text-white text-xs truncate">SMK MUHAMMADIYAH SAMPIT</p>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown menu — muncul di bawah navbar, bukan menyempitkan konten */}
        {mobileOpen && (
          <div className="border-t border-white/10 px-3 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {navItems('mobile')}
            <div className="pt-2 mt-2 border-t border-white/10">
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
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-[#0B1B3A] fixed left-0 top-0 bottom-0 flex-col z-30 transition-all duration-200`}
      >
        <div className="relative">
          <div className={`px-5 py-5 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-[#0B1B3A] text-xs">SM</span>
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="font-display font-bold text-white text-xs tracking-wide truncate">SMK MUHAMMADIYAH</p>
                <p className="font-display font-bold text-[#F2B705] text-xs tracking-wide">SAMPIT</p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setCollapsed((v) => !v); setOpenDropdown(null); }}
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50">Administrator</p>
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
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          {activeTab === 'master' ? (
            <MasterDataTab activeSub={activeMasterSub} />
          ) : activeTab === 'pengaturan' ? (
            <SettingsTab activeSub={activeSettingsSub} />
          ) : activeTab === 'pkl' ? (
            <PklTab activeSub={activePklSub} />
          ) : activeTab === 'laporan' ? (
            <ReportTab activeSub={activeReportSub} />
          ) : (
            ActiveComponent && <ActiveComponent />
          )}
        </div>
      </div>
    </div>
  );
}
