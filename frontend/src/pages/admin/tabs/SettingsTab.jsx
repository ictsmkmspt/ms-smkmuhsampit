import JamMasukTab from '../settings/JamMasukTab';
import PoinPelanggaranTab from '../settings/PoinPelanggaranTab';
import KalenderLiburTab from '../settings/KalenderLiburTab';
import PoinPrestasiTab from '../settings/PoinPrestasiTab';

export const SETTINGS_SUBMENU = [
  { key: 'jam',      label: 'Pengaturan Jam Masuk', component: JamMasukTab },
  { key: 'poin',     label: 'Poin Pelanggaran',     component: PoinPelanggaranTab },
  { key: 'prestasi', label: 'Poin Prestasi',        component: PoinPrestasiTab },
  { key: 'libur',    label: 'Kalender Libur',       component: KalenderLiburTab },
];

export default function SettingsTab({ activeSub }) {
  const current = SETTINGS_SUBMENU.find((s) => s.key === activeSub) || SETTINGS_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
