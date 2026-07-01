import { useState, useRef, useEffect } from 'react';
import { LogOut, Database, ClipboardList, Settings, ChevronDown, Users, GraduationCap, School } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MasterDataTab, { MASTER_DATA_SUBMENU } from './tabs/MasterDataTab';
import ReportTab from './tabs/ReportTab';
import SettingsTab from './tabs/SettingsTab';

const SUBMENU_ICONS = { siswa: Users, guru: GraduationCap, kelas: School };

const TABS = [
  { key: 'master',     label: 'Master Data', icon: Database,      component: MasterDataTab, hasDropdown: true },
  { key: 'laporan',    label: 'Laporan',     icon: ClipboardList, component: ReportTab },
  { key: 'pengaturan', label: 'Pengaturan',  icon: Settings,      component: SettingsTab },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('master');
  const [activeMasterSub, setActiveMasterSub] = useState('siswa');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  const handleTabClick = (tab) => {
    if (tab.hasDropdown) {
      setActiveTab(tab.key);
      setDropdownOpen((prev) => (activeTab === tab.key ? !prev : true));
    } else {
      setActiveTab(tab.key);
      setDropdownOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="bg-white border-b border-line-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-ink-500">Admin</p>
            <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-1 w-fit mb-6 relative" ref={dropdownRef}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <div key={tab.key} className="relative">
                <button
                  onClick={() => handleTabClick(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                  {tab.hasDropdown && (
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActive && dropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {tab.hasDropdown && isActive && dropdownOpen && (
                  <div className="absolute z-20 mt-1 w-48 surface-card overflow-hidden">
                    {MASTER_DATA_SUBMENU.map((sub) => {
                      const SubIcon = SUBMENU_ICONS[sub.key];
                      return (
                        <button
                          key={sub.key}
                          onClick={() => { setActiveMasterSub(sub.key); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition ${
                            activeMasterSub === sub.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-mist-50'
                          }`}
                        >
                          <SubIcon className="w-4 h-4" /> {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pb-10">
          {activeTab === 'master'
            ? <MasterDataTab activeSub={activeMasterSub} />
            : ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
