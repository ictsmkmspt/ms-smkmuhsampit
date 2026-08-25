import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProfileProvider } from './context/SchoolProfileContext';
import ProtectedRoute from './components/ProtectedRoute';
import api from './api/axios';

import Login from './pages/Login';
import MaintenancePage from './pages/MaintenancePage';
import PpdbPublic from './pages/PpdbPublic';
import LowonganPublic from './pages/LowonganPublic';
import LowonganDetailPublic from './pages/LowonganDetailPublic';
import BursaLoginPage from './pages/BursaLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuruDashboard from './pages/guru/GuruDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import ParentDashboard from './pages/wali/ParentDashboard';
import InstrukturDashboard from './pages/instruktur/InstrukturDashboard';
import IdukaDashboard from './pages/iduka/IdukaDashboard';
import PelamarDetailPage from './pages/iduka/PelamarDetailPage';
import BkkDashboard from './pages/bkk/BkkDashboard';
import TuDashboard from './pages/tu/TuDashboard';
import KepalaSekolahDashboard from './pages/kepala-sekolah/KepalaSekolahDashboard';
import RoomStaffDashboard from './pages/sarpras-staff/RoomStaffDashboard';
import BkDashboard from './pages/bk/BkDashboard';
import PerpustakaanStaffDashboard from './pages/perpustakaan-staff/PerpustakaanStaffDashboard';
import PrintMonthlyAttendance from './pages/print/PrintMonthlyAttendance';
import PrintPklJurnal from './pages/print/PrintPklJurnal';
import PrintPklJurnalKegiatan from './pages/print/PrintPklJurnalKegiatan';
import PrintPklPembimbingan from './pages/print/PrintPklPembimbingan';
import PrintSppNota from './pages/print/PrintSppNota';
import PrintTagihanLainNota from './pages/print/PrintTagihanLainNota';
import PrintTagihanBelumBayar from './pages/print/PrintTagihanBelumBayar';
import PrintLaporanTunggakan from './pages/print/PrintLaporanTunggakan';
import PrintLaporanTunggakanAlumni from './pages/print/PrintLaporanTunggakanAlumni';
import PrintKalenderAkademik from './pages/print/PrintKalenderAkademik';
import PrintAssetLabels from './pages/print/PrintAssetLabels';
import PrintBukuLabels from './pages/print/PrintBukuLabels';
import PrintKartuPelajar from './pages/print/PrintKartuPelajar';
import PrintBukuInduk from './pages/print/PrintBukuInduk';
import EditBiodataSiswaPage from './pages/EditBiodataSiswaPage';
import PrintPenilaianPkl from './pages/print/PrintPenilaianPkl';
import PrintSuratRekomendasi from './pages/print/PrintSuratRekomendasi';
import PrintKartuPencariKerja from './pages/print/PrintKartuPencariKerja';
import ExamAttemptPage from './pages/siswa/ExamAttemptPage';
import CbtPortalLogin from './pages/cbt-portal/CbtPortalLogin';
import CbtGuruPortal from './pages/cbt-portal/CbtGuruPortal';
import CbtSiswaPortal from './pages/cbt-portal/CbtSiswaPortal';
import CbtPengawasPortal from './pages/cbt-portal/CbtPengawasPortal';
import CbtAdminPortal from './pages/cbt-portal/CbtAdminPortal';

/**
 * Gerbang mode maintenance — dicek SEKALI di sini, membungkus seluruh
 * <Routes>, supaya konsisten di semua rute sekaligus (bukan diulang per
 * halaman). /login SENGAJA selalu tembus (biar admin bisa login &
 * mematikan mode ini lagi dari MaintenancePage), begitu juga kalau yang
 * login memang admin. Dicek ulang tiap 60 detik supaya pengunjung yang
 * sudah terlanjur buka halaman maintenance otomatis lihat web normal lagi
 * begitu admin mematikannya, tanpa perlu refresh manual.
 */
function MaintenanceGate({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState({ loading: true, enabled: false });

  useEffect(() => {
    const check = () => api.get('/maintenance-status')
      .then((res) => setStatus({ loading: false, enabled: res.data.enabled }))
      .catch(() => setStatus({ loading: false, enabled: false }));
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
          <p className="text-sm text-ink-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!status.enabled || user?.role === 'admin' || location.pathname === '/login') {
    return children;
  }

  return <MaintenancePage />;
}

// Portal CBT dipakai bersama guru, siswa, pengawas ujian & admin/waka
// kurikulum lewat 1 gerbang login (/ujian/login) — begitu masuk, kontennya
// beda per peran. Admin/waka_kurikulum di sini SENGAJA terpisah dari
// /admin (AdminDashboard SIM Sekolah) — pengaturan SIM dan pengelolaan CBT
// (Monitoring, Bank Soal/Materi semua guru, akun Pengawas Ujian) jadi 2
// menu berbeda walau akunnya sama, login-nya pun terpisah (lihat
// CbtAdminPortal).
function CbtPortalHome() {
  const { user } = useAuth();
  if (user.role === 'guru') return <CbtGuruPortal />;
  if (user.role === 'pengawas_ujian') return <CbtPengawasPortal />;
  if (user.role === 'admin' || user.role === 'waka_kurikulum') return <CbtAdminPortal />;
  return <CbtSiswaPortal />;
}

export default function App() {
  return (
    <SchoolProfileProvider>
      <AuthProvider>
        <BrowserRouter>
          <MaintenanceGate>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/ppdb" element={<PpdbPublic />} />
            <Route path="/bursakerjakhusus" element={<LowonganPublic />} />
            <Route path="/bursakerjakhusus/masuk" element={<BursaLoginPage />} />
            <Route path="/bursakerjakhusus/:id" element={<LowonganDetailPublic />} />

            <Route path="/print/absensi-bulanan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'bk']}><PrintMonthlyAttendance /></ProtectedRoute>
            } />

            <Route path="/print/pkl-jurnal" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'instruktur', 'siswa']}><PrintPklJurnal /></ProtectedRoute>
            } />

            <Route path="/print/pkl-jurnal-kegiatan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'instruktur', 'siswa']}><PrintPklJurnalKegiatan /></ProtectedRoute>
            } />

            <Route path="/print/pkl-pembimbingan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'instruktur']}><PrintPklPembimbingan /></ProtectedRoute>
            } />

            <Route path="/print/spp-nota" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintSppNota /></ProtectedRoute>
            } />

            <Route path="/print/tagihan-lain-nota" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintTagihanLainNota /></ProtectedRoute>
            } />

            <Route path="/print/tagihan-belum-bayar" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintTagihanBelumBayar /></ProtectedRoute>
            } />

            <Route path="/print/laporan-tunggakan" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintLaporanTunggakan /></ProtectedRoute>
            } />

            <Route path="/print/laporan-tunggakan-alumni" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintLaporanTunggakanAlumni /></ProtectedRoute>
            } />

            <Route path="/print/kalender-akademik" element={
              <ProtectedRoute allowedRoles={['admin', 'waka_kurikulum']}><PrintKalenderAkademik /></ProtectedRoute>
            } />

            <Route path="/print/aset-label" element={
              <ProtectedRoute allowedRoles={['admin', 'waka_sarpras', 'teknisi', 'kepala_bengkel']}><PrintAssetLabels /></ProtectedRoute>
            } />

            <Route path="/print/buku-label" element={
              <ProtectedRoute allowedRoles={['admin', 'pustakawan']}><PrintBukuLabels /></ProtectedRoute>
            } />

            <Route path="/print/kartu-pelajar" element={
              <ProtectedRoute allowedRoles={['admin', 'waka_kesiswaan']}><PrintKartuPelajar /></ProtectedRoute>
            } />

            <Route path="/print/buku-induk/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'waka_kesiswaan', 'tu']}><PrintBukuInduk /></ProtectedRoute>
            } />

            <Route path="/siswa/:id/edit-biodata" element={
              <ProtectedRoute allowedRoles={['admin', 'waka_kesiswaan', 'tu']}><EditBiodataSiswaPage /></ProtectedRoute>
            } />

            <Route path="/print/penilaian-pkl/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'instruktur']}><PrintPenilaianPkl /></ProtectedRoute>
            } />

            <Route path="/print/surat-rekomendasi" element={
              <ProtectedRoute allowedRoles={['admin', 'pengurus_bkk']}><PrintSuratRekomendasi /></ProtectedRoute>
            } />

            <Route path="/print/kartu-pencari-kerja" element={
              <ProtectedRoute allowedRoles={['admin', 'pengurus_bkk']}><PrintKartuPencariKerja /></ProtectedRoute>
            } />

            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin', 'waka']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/waka-kesiswaan/*" element={
              <ProtectedRoute allowedRoles={['waka_kesiswaan']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/waka-kurikulum/*" element={
              <ProtectedRoute allowedRoles={['waka_kurikulum']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/waka-humas/*" element={
              <ProtectedRoute allowedRoles={['waka_humas']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/waka-sarpras/*" element={
              <ProtectedRoute allowedRoles={['waka_sarpras']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/guru/*" element={
              <ProtectedRoute allowedRoles={['guru', 'admin']}><GuruDashboard /></ProtectedRoute>
            } />

            <Route path="/siswa/*" element={
              <ProtectedRoute allowedRoles={['siswa']}><SiswaDashboard /></ProtectedRoute>
            } />

            <Route path="/ujian/login" element={<CbtPortalLogin />} />

            <Route path="/ujian/exam/:attemptId" element={
              <ProtectedRoute allowedRoles={['siswa']}><ExamAttemptPage /></ProtectedRoute>
            } />

            <Route path="/ujian" element={
              <ProtectedRoute allowedRoles={['guru', 'siswa', 'pengawas_ujian', 'admin', 'waka_kurikulum']}><CbtPortalHome /></ProtectedRoute>
            } />

            <Route path="/wali/*" element={
              <ProtectedRoute allowedRoles={['wali']}><ParentDashboard /></ProtectedRoute>
            } />

            <Route path="/instruktur/*" element={
              <ProtectedRoute allowedRoles={['instruktur']}><InstrukturDashboard /></ProtectedRoute>
            } />

            <Route path="/iduka" element={
              <ProtectedRoute allowedRoles={['iduka']}><IdukaDashboard /></ProtectedRoute>
            } />

            <Route path="/iduka/pelamar/:id" element={
              <ProtectedRoute allowedRoles={['iduka']}><PelamarDetailPage /></ProtectedRoute>
            } />

            <Route path="/bkk" element={
              <ProtectedRoute allowedRoles={['pengurus_bkk']}><BkkDashboard /></ProtectedRoute>
            } />

            <Route path="/tu/*" element={
              <ProtectedRoute allowedRoles={['tu']}><TuDashboard /></ProtectedRoute>
            } />

            <Route path="/staf-ruang/*" element={
              <ProtectedRoute allowedRoles={['teknisi', 'kepala_bengkel']}><RoomStaffDashboard /></ProtectedRoute>
            } />

            <Route path="/bk/*" element={
              <ProtectedRoute allowedRoles={['bk']}><BkDashboard /></ProtectedRoute>
            } />

            <Route path="/kepala-sekolah/*" element={
              <ProtectedRoute allowedRoles={['kepala_sekolah']}><KepalaSekolahDashboard /></ProtectedRoute>
            } />

            <Route path="/perpustakaan-staff/*" element={
              <ProtectedRoute allowedRoles={['pustakawan']}><PerpustakaanStaffDashboard /></ProtectedRoute>
            } />

            <Route path="*" element={<Login />} />
          </Routes>
          </MaintenanceGate>
        </BrowserRouter>
      </AuthProvider>
    </SchoolProfileProvider>
  );
}
