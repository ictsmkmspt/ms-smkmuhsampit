import AcademicCalendarTab from '../kurikulum/AcademicCalendarTab';
import KalenderLiburTab from '../settings/KalenderLiburTab';

export const KURIKULUM_SUBMENU = [
  { key: 'kalender', label: 'Kalender Akademik',     component: AcademicCalendarTab },
  { key: 'libur',    label: 'Kalender Libur',        component: KalenderLiburTab },
];

export default function KurikulumTab({ activeSub }) {
  const current = KURIKULUM_SUBMENU.find((s) => s.key === activeSub) || KURIKULUM_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
