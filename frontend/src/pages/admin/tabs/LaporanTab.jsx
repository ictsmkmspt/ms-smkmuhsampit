import AttendanceReportTab from './AttendanceReportTab';
import ViolationReportTab from './ViolationReportTab';
import AchievementReportTab from './AchievementReportTab';
import RekapBkTab from './RekapBkTab';
import NilaiAkademikReportTab from './NilaiAkademikReportTab';
import TahsinReportTab from './TahsinReportTab';
import TahfidzReportTab from './TahfidzReportTab';
import TadarusReportTab from './TadarusReportTab';
import KegiatanSiswaReportTab from './pkl-laporan/KegiatanSiswaReportTab';
import MonitoringGuruReportTab from './pkl-laporan/MonitoringGuruReportTab';

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
  { key: 'nilai-akademik', label: 'Rekap Nilai Akademik', component: NilaiAkademikReportTab, restrictTo: ['waka_kurikulum'] },
  {
    key: 'pkl', label: 'Rekap PKL', restrictTo: ['waka_kurikulum'], children: [
      { key: 'pkl-kegiatan', label: 'Rekap Kegiatan Siswa', component: KegiatanSiswaReportTab },
      { key: 'pkl-monitoring', label: 'Rekap Monitoring Guru', component: MonitoringGuruReportTab },
    ],
  },
  { key: 'tahsin', label: 'Rekap Tahsin', component: TahsinReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'tahfidz', label: 'Rekap Tahfidz', component: TahfidzReportTab, restrictTo: ['waka_kesiswaan'] },
  { key: 'tadarus', label: 'Rekap Tadarus', component: TadarusReportTab, restrictTo: ['waka_kesiswaan'] },
];

function cariSub(subKey) {
  for (const item of LAPORAN_SUBMENU) {
    if (item.key === subKey) return item;
    const anak = item.children?.find((c) => c.key === subKey);
    if (anak) return anak;
  }
  return null;
}

export default function LaporanTab({ activeSub }) {
  const current = cariSub(activeSub) || LAPORAN_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
