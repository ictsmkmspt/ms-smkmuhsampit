import InstrukturTab from './pkl/InstrukturTab';
import PenempatanTab from './pkl/PenempatanTab';
import MonitoringJadwalTab from './pkl/MonitoringJadwalTab';

// Kelola IDUKA PINDAH jadi menu sendiri di sidebar (lihat AdminDashboard.jsx)
// — bukan submenu PKL lagi, karena IDUKA ke depan arahnya ke fitur lain
// (lowongan kerja) yang beda urusan dari PKL.
export const PKL_SUBMENU = [
  { key: 'instruktur',   label: 'Kelola Instruktur', component: InstrukturTab, restrictTo: ['waka_humas', 'waka_kurikulum'] },
  { key: 'penempatan',  label: 'Penempatan PKL',  component: PenempatanTab, restrictTo: ['waka_humas', 'waka_kurikulum'] },
  // Jadwal Monitoring GLOBAL (berlaku semua guru) sengaja cuma milik
  // Waka Kurikulum, bukan Waka Humas — beda dari menu-menu di atas.
  { key: 'monitoring',  label: 'Jadwal Monitoring', component: MonitoringJadwalTab, restrictTo: ['waka_kurikulum'] },
];

export default function PklTab({ activeSub }) {
  const current = PKL_SUBMENU.find((s) => s.key === activeSub) || PKL_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
