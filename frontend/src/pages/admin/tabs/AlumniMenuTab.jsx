import AlumniTab from './AlumniTab';
import WaliAlumniTab from '../alumni/WaliAlumniTab';

export const ALUMNI_SUBMENU = [
  { key: 'siswa', label: 'Alumni Siswa',       component: AlumniTab },
  { key: 'wali',  label: 'Wali Siswa Alumni',  component: WaliAlumniTab },
];

export default function AlumniMenuTab({ activeSub }) {
  const current = ALUMNI_SUBMENU.find((s) => s.key === activeSub) || ALUMNI_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
