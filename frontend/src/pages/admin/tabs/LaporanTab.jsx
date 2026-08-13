import AttendanceReportTab from './AttendanceReportTab';
import ViolationReportTab from './ViolationReportTab';
import AchievementReportTab from './AchievementReportTab';
import RekapBkTab from './RekapBkTab';
import NilaiAkademikReportTab from './NilaiAkademikReportTab';
import TahsinReportTab from './TahsinReportTab';
import TahfidzReportTab from './TahfidzReportTab';
import TadarusReportTab from './TadarusReportTab';
import PklReportTab from './PklReportTab';

// Sub-menu "Laporan" — kumpulan rekap yang sebelumnya tersebar (Rekap
// Absensi jadi tab sendiri, Rekap Pelanggaran/Prestasi/BK nyempil di
// dalam menu Poin bercampur dengan Jenis Pelanggaran/Prestasi & Sanksi
// Bertingkat yang sifatnya pengaturan, bukan laporan). Komponennya dipakai
// ulang apa adanya (sama seperti yang dipakai Laporan BK & Laporan Guru),
// bukan duplikat baru. Nilai Akademik/Tahsin/Tahfidz/Tadarus dibagi 2
// bidang: Nilai Akademik punya Waka Kurikulum, sisanya (Tahsin/Tahfidz/
// Tadarus) punya Waka Kesiswaan — sama seperti pembagian Rekap Absensi/
// Pelanggaran/Prestasi/BK yang juga milik Kesiswaan.
export const LAPORAN_SUBMENU = [
  { key: 'absensi', label: 'Rekap Absensi', component: AttendanceReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'pelanggaran', label: 'Rekap Pelanggaran', component: ViolationReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'prestasi', label: 'Rekap Prestasi', component: AchievementReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'bk', label: 'Rekap BK', component: RekapBkTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'nilai-akademik', label: 'Nilai Akademik', component: NilaiAkademikReportTab, restrictTo: ['waka_kurikulum'] },
  { key: 'pkl', label: 'PKL', component: PklReportTab, restrictTo: ['waka_kurikulum'] },
  { key: 'tahsin', label: 'Tahsin', component: TahsinReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'tahfidz', label: 'Tahfidz', component: TahfidzReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'tadarus', label: 'Tadarus', component: TadarusReportTab, restrictTo: ['waka_kesiswaan'] },
];

export default function LaporanTab({ activeSub }) {
  const current = LAPORAN_SUBMENU.find((s) => s.key === activeSub) || LAPORAN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
