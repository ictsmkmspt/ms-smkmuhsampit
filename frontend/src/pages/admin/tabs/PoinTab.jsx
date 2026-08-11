import PoinPelanggaranTab from '../settings/PoinPelanggaranTab';
import PoinPrestasiTab from '../settings/PoinPrestasiTab';
import SanksiTab from '../kesiswaan/SanksiTab';

// Rekap Pelanggaran/Prestasi/BK sudah pindah ke menu Laporan (lihat
// LaporanTab.jsx) — di sini tinggal pengaturan sistem poin: jenis
// pelanggaran/prestasi dan eskalasi Sanksi Bertingkat.
export const POIN_SUBMENU = [
  { key: 'jenis-pelanggaran', label: 'Jenis Pelanggaran', component: PoinPelanggaranTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'jenis-prestasi',    label: 'Jenis Prestasi',    component: PoinPrestasiTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'sanksi',            label: 'Sanksi Bertingkat', component: SanksiTab, restrictTo: ['waka_kesiswaan'] },
];

export default function PoinTab({ activeSub }) {
  const current = POIN_SUBMENU.find((s) => s.key === activeSub) || POIN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
