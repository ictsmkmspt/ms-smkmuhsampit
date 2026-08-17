import JamMasukTab from '../settings/JamMasukTab';
import ProfilSekolahTab from '../settings/ProfilSekolahTab';
import BackupTab from '../settings/BackupTab';
import MaintenanceModeTab from '../settings/MaintenanceModeTab';
import JurusanTab from '../settings/JurusanTab';
import KartuPelajarTab from '../settings/KartuPelajarTab';

// Tahun Ajaran sudah digabung ke dalam Profil Sekolah (bukan menu
// terpisah lagi) — lihat ProfilSekolahTab.jsx.
export const SETTINGS_SUBMENU = [
  { key: 'sekolah',        label: 'Profil Sekolah', component: ProfilSekolahTab },
  { key: 'jam',            label: 'Jam Masuk', component: JamMasukTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'jurusan',        label: 'Jurusan', component: JurusanTab, restrictTo: [] },
  { key: 'kartu-pelajar',  label: 'Kartu Pelajar', component: KartuPelajarTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'backup',         label: 'Backup & Impor', component: BackupTab, restrictTo: [] },
  { key: 'maintenance',    label: 'Mode Maintenance', component: MaintenanceModeTab, restrictTo: [] },
];

export default function SettingsTab({ activeSub }) {
  const current = SETTINGS_SUBMENU.find((s) => s.key === activeSub) || SETTINGS_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
