import JamMasukTab from '../settings/JamMasukTab';
import ProfilSekolahTab from '../settings/ProfilSekolahTab';
import BackupTab from '../settings/BackupTab';

export const SETTINGS_SUBMENU = [
  { key: 'sekolah',  label: 'Profil Sekolah', component: ProfilSekolahTab },
  { key: 'jam',      label: 'Jam Masuk', component: JamMasukTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'backup',   label: 'Backup & Impor', component: BackupTab, restrictTo: [] },
];

export default function SettingsTab({ activeSub }) {
  const current = SETTINGS_SUBMENU.find((s) => s.key === activeSub) || SETTINGS_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
