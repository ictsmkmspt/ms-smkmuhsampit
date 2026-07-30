import AttendanceReportTab from './AttendanceReportTab';
import ViolationReportTab from './ViolationReportTab';
import AchievementReportTab from './AchievementReportTab';

export const REPORT_SUBMENU = [
  { key: 'absensi', label: 'Rekap Absensi',           component: AttendanceReportTab },
  { key: 'poin',    label: 'Rekap Poin Pelanggaran',  component: ViolationReportTab },
  { key: 'prestasi', label: 'Rekap Poin Prestasi',    component: AchievementReportTab },
];

export default function ReportTab({ activeSub }) {
  const current = REPORT_SUBMENU.find((s) => s.key === activeSub) || REPORT_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
