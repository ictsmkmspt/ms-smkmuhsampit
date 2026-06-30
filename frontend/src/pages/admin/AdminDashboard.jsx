import { useState } from 'react';
import { LogOut, Users, GraduationCap, School, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StudentsTab from './tabs/StudentsTab';
import TeachersTab from './tabs/TeachersTab';
import ClassesTab from './tabs/ClassesTab';
import ReportTab from './tabs/ReportTab';
import SettingsTab from './tabs/SettingsTab';

const TABS = [
  { key: 'siswa',      label: 'Siswa',      icon: Users,         component: StudentsTab },
  { key: 'guru',       label: 'Guru',        icon: GraduationCap, component: TeachersTab },
  { key: 'kelas',      label: 'Kelas',       icon: School,        component: ClassesTab },
  { key: 'laporan',    label: 'Laporan',     icon: ClipboardList, component: ReportTab },
  { key: 'pengaturan', label: 'Pengaturan',  icon: Settings,      component: SettingsTab },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('siswa');

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

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
        <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-1 w-fit mb-6 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="pb-10">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
