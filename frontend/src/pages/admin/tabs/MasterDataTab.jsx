import StudentsTab from './StudentsTab';
import TeachersTab from './TeachersTab';
import ClassesTab from './ClassesTab';
import WaliTab from './WaliTab';
import TuAccountsTab from './TuAccountsTab';
import AlumniTab from './AlumniTab';

export const MASTER_DATA_SUBMENU = [
  { key: 'siswa', label: 'Siswa', component: StudentsTab },
  { key: 'guru',  label: 'Guru',  component: TeachersTab },
  { key: 'kelas', label: 'Kelas', component: ClassesTab },
  { key: 'wali',  label: 'Wali Murid', component: WaliTab },
  { key: 'tu',    label: 'Akun TU', component: TuAccountsTab },
  { key: 'alumni', label: 'Alumni', component: AlumniTab },
];

export default function MasterDataTab({ activeSub }) {
  const current = MASTER_DATA_SUBMENU.find((s) => s.key === activeSub) || MASTER_DATA_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
