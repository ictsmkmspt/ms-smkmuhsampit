import AcademicCalendarTab from '../kurikulum/AcademicCalendarTab';
import KalenderLiburTab from '../settings/KalenderLiburTab';
import SubjectsTab from '../kurikulum/SubjectsTab';
import TeachingAssignmentsTab from '../kurikulum/TeachingAssignmentsTab';
import SchedulesTab from '../kurikulum/SchedulesTab';
import PeriodTemplateTab from '../kurikulum/PeriodTemplateTab';

export const KURIKULUM_SUBMENU = [
  {
    key: 'kalender', label: 'Kalender', children: [
      { key: 'akademik', label: 'Kalender Akademik', component: AcademicCalendarTab },
      { key: 'libur',    label: 'Kalender Libur',    component: KalenderLiburTab },
    ],
  },
  { key: 'mapel',    label: 'Mata Pelajaran',   component: SubjectsTab },
  { key: 'tugas',    label: 'Tugas Mengajar',   component: TeachingAssignmentsTab },
  { key: 'jadwal',   label: 'Jadwal Pelajaran', component: SchedulesTab },
  { key: 'template', label: 'Template Jadwal',  component: PeriodTemplateTab },
];

function cariSub(subKey) {
  for (const item of KURIKULUM_SUBMENU) {
    if (item.key === subKey) return item;
    const anak = item.children?.find((c) => c.key === subKey);
    if (anak) return anak;
  }
  return null;
}

export default function KurikulumTab({ activeSub }) {
  const current = cariSub(activeSub) || KURIKULUM_SUBMENU[0].children[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
