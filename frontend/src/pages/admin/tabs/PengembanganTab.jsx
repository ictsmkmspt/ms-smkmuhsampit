import FormulirPpdbTab from '../ppdb/FormulirPpdbTab';
import MaintenanceTab from '../sarpras/MaintenanceTab';
import ProcurementsTab from '../sarpras/ProcurementsTab';

// Fitur yang masih tahap uji coba — sengaja cuma dibuka untuk Super Admin
// dulu, belum dibagikan ke Waka terkait sampai dianggap siap. Mata
// Pelajaran/Tugas Mengajar/Jadwal Pelajaran/Template Jadwal sudah pindah
// jadi bagian tetap menu Pembelajaran (Waka Kurikulum). Backend menu ini
// juga sudah dibatasi role:admin, bukan cuma disembunyikan di sini.
export const PENGEMBANGAN_SUBMENU = [
  { key: 'ppdb',          label: 'Formulir PPDB',      component: FormulirPpdbTab },
  { key: 'pemeliharaan',  label: 'Pemeliharaan',       component: MaintenanceTab },
  { key: 'pengadaan',     label: 'Pengadaan Barang',   component: ProcurementsTab },
];

export default function PengembanganTab({ activeSub }) {
  const current = PENGEMBANGAN_SUBMENU.find((s) => s.key === activeSub) || PENGEMBANGAN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
