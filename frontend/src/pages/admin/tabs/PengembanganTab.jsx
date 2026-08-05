import FormulirPpdbTab from '../ppdb/FormulirPpdbTab';
import SubjectsTab from '../kurikulum/SubjectsTab';
import TeachingAssignmentsTab from '../kurikulum/TeachingAssignmentsTab';
import SchedulesTab from '../kurikulum/SchedulesTab';
import MaintenanceTab from '../sarpras/MaintenanceTab';
import ProcurementsTab from '../sarpras/ProcurementsTab';

// Fitur yang masih tahap uji coba — sengaja cuma dibuka untuk Super Admin
// dulu, belum dibagikan ke Waka terkait (Humas/Kurikulum/Sarpras) sampai
// dianggap siap. Backend-nya juga sudah dibatasi role:admin, bukan cuma
// disembunyikan di menu ini.
export const PENGEMBANGAN_SUBMENU = [
  { key: 'ppdb',          label: 'Formulir PPDB',      component: FormulirPpdbTab },
  { key: 'mapel',         label: 'Mata Pelajaran',     component: SubjectsTab },
  { key: 'tugas',         label: 'Tugas Mengajar',     component: TeachingAssignmentsTab },
  { key: 'jadwal',        label: 'Jadwal Pelajaran',   component: SchedulesTab },
  { key: 'pemeliharaan',  label: 'Pemeliharaan',       component: MaintenanceTab },
  { key: 'pengadaan',     label: 'Pengadaan Barang',   component: ProcurementsTab },
];

export default function PengembanganTab({ activeSub }) {
  const current = PENGEMBANGAN_SUBMENU.find((s) => s.key === activeSub) || PENGEMBANGAN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
