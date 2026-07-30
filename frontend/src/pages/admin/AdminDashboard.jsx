import { useState } from 'react';
import {
  LogOut, Database, ClipboardList, Settings, ChevronDown,
  Users, GraduationCap, School, UserCog, Briefcase, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MasterDataTab, { MASTER_DATA_SUBMENU } from './tabs/MasterDataTab';
import ReportTab from './tabs/ReportTab';
import SettingsTab from './tabs/SettingsTab';
import PklTab from './tabs/PklTab';
import DashboardHomeTab from './tabs/DashboardHomeTab';

const SUBMENU_ICONS = { siswa: Users, guru: GraduationCap, kelas: School, wali: UserCog };

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, component: DashboardHomeTab },
  { key: 'master',     label: 'Master Data', icon: Database,        hasDropdown: true },
  { key: 'laporan',    label: 'Laporan',     icon: ClipboardList,   component: ReportTab },
  { key: 'pkl',        label: 'PKL',         icon: Briefcase,       component: PklTab },
  { key: 'pengaturan', label: 'Pengaturan',  icon: Settings,        component: SettingsTab },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMasterSub, setActiveMasterSub] = useState('siswa');
  const [masterOpen, setMasterOpen] = useState(false);

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const handleTabClick = (tab) => {
    if (tab.hasDropdown) {
      setMasterOpen((prev) => (activeTab === tab.key ? !prev : true));
      setActiveTab(tab.key);
    } else {
      setActiveTab(tab.key);
    }
  };

  return (
    <div className="min-h-screen bg-mist-50 flex">
      {/* Sidebar kiri */}
      <aside className="w-64 shrink-0 bg-[#0B1B3A] fixed left-0 top-0 bottom-0 flex flex-col z-30">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-[#0B1B3A] text-xs">SM</span>
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-display font-bold text-white text-xs tracking-wide truncate">SMK MUHAMMADIYAH</p>
            <p className="font-display font-bold text-[#F2B705] text-xs tracking-wide">SAMPIT</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-white/50">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            if (tab.hasDropdown) {
              return (
                <div key={tab.key}>
                  <button
                    onClick={() => handleTabClick(tab)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {tab.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActive && masterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isActive && masterOpen && (
                    <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                      {MASTER_DATA_SUBMENU.map((sub) => {
                        const SubIcon = SUBMENU_ICONS[sub.key];
                        const subActive = activeMasterSub === sub.key;
                        return (
                          <button
                            key={sub.key}
                            onClick={() => setActiveMasterSub(sub.key)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
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
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Konten utama */}
      <div className="ml-64 flex-1 min-w-0">
        <div className="px-8 py-6 max-w-6xl mx-auto">
          {activeTab === 'master'
            ? <MasterDataTab activeSub={activeMasterSub} />
            : ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
