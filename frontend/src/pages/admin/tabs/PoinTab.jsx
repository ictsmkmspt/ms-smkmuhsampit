import ViolationReportTab from './ViolationReportTab';
import AchievementReportTab from './AchievementReportTab';
import PoinPelanggaranTab from '../settings/PoinPelanggaranTab';
import PoinPrestasiTab from '../settings/PoinPrestasiTab';
import SanksiTab from '../kesiswaan/SanksiTab';

export const POIN_SUBMENU = [
  { key: 'rekap-pelanggaran', label: 'Rekap Pelanggaran',      component: ViolationReportTab },
  { key: 'rekap-prestasi',    label: 'Rekap Prestasi',         component: AchievementReportTab },
  { key: 'jenis-pelanggaran', label: 'Jenis Pelanggaran',      component: PoinPelanggaranTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'jenis-prestasi',    label: 'Jenis Prestasi',         component: PoinPrestasiTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'sanksi',            label: 'Sanksi Bertingkat',      component: SanksiTab, restrictTo: ['waka_kesiswaan'] },
];

export default function PoinTab({ activeSub }) {
  const current = POIN_SUBMENU.find((s) => s.key === activeSub) || POIN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
