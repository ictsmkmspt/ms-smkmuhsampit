import StudentsTab from './StudentsTab';
import TeachersTab from './TeachersTab';
import ClassesTab from './ClassesTab';
import WaliTab from './WaliTab';
import TuAccountsTab from './TuAccountsTab';
import BkAccountsTab from './BkAccountsTab';
import BkkAccountsTab from './BkkAccountsTab';
import AdminAccountsTab from './AdminAccountsTab';

export const MASTER_DATA_SUBMENU = [
  { key: 'admin', label: 'Admin', component: AdminAccountsTab, adminOnly: true },
  { key: 'guru',  label: 'Guru',  component: TeachersTab, restrictTo: ['waka_kurikulum', 'waka_humas'] },
  { key: 'tu',    label: 'TU', component: TuAccountsTab, restrictTo: ['waka_humas'] },
  { key: 'bk',    label: 'BK', component: BkAccountsTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'bkk',   label: 'Pengurus BKK', component: BkkAccountsTab, restrictTo: ['waka_humas'] },
  { key: 'kelas', label: 'Kelas', component: ClassesTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'siswa', label: 'Siswa', component: StudentsTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'wali',  label: 'Wali Siswa', component: WaliTab, restrictTo: ['waka_kesiswaan'] },
];

export default function MasterDataTab({ activeSub }) {
  const current = MASTER_DATA_SUBMENU.find((s) => s.key === activeSub) || MASTER_DATA_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
