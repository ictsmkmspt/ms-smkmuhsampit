import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProfileProvider } from './context/SchoolProfileContext';
import ProtectedRoute from './components/ProtectedRoute';
import api from './api/axios';

import Login from './pages/Login';
import MaintenancePage from './pages/MaintenancePage';
import PpdbPublic from './pages/PpdbPublic';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuruDashboard from './pages/guru/GuruDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import ParentDashboard from './pages/wali/ParentDashboard';
import DudiDashboard from './pages/dudi/DudiDashboard';
import TuDashboard from './pages/tu/TuDashboard';
import RoomStaffDashboard from './pages/sarpras-staff/RoomStaffDashboard';
import BkDashboard from './pages/bk/BkDashboard';
import PerpustakaanStaffDashboard from './pages/perpustakaan-staff/PerpustakaanStaffDashboard';
import PrintMonthlyAttendance from './pages/print/PrintMonthlyAttendance';
import PrintPklJurnal from './pages/print/PrintPklJurnal';
import PrintPklJurnalKegiatan from './pages/print/PrintPklJurnalKegiatan';
import PrintPklPembimbingan from './pages/print/PrintPklPembimbingan';
import PrintSppNota from './pages/print/PrintSppNota';
import PrintTagihanLainNota from './pages/print/PrintTagihanLainNota';
import PrintKalenderAkademik from './pages/print/PrintKalenderAkademik';
import PrintAssetLabels from './pages/print/PrintAssetLabels';
import PrintBukuLabels from './pages/print/PrintBukuLabels';

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

            <Route path="/print/absensi-bulanan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'bk']}><PrintMonthlyAttendance /></ProtectedRoute>
            } />

            <Route path="/print/pkl-jurnal" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'dudi', 'siswa']}><PrintPklJurnal /></ProtectedRoute>
            } />

            <Route path="/print/pkl-jurnal-kegiatan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'dudi', 'siswa']}><PrintPklJurnalKegiatan /></ProtectedRoute>
            } />

            <Route path="/print/pkl-pembimbingan" element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'dudi']}><PrintPklPembimbingan /></ProtectedRoute>
            } />

            <Route path="/print/spp-nota" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintSppNota /></ProtectedRoute>
            } />

            <Route path="/print/tagihan-lain-nota" element={
              <ProtectedRoute allowedRoles={['tu']}><PrintTagihanLainNota /></ProtectedRoute>
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

            <Route path="/wali/*" element={
              <ProtectedRoute allowedRoles={['wali']}><ParentDashboard /></ProtectedRoute>
            } />

            <Route path="/dudi/*" element={
              <ProtectedRoute allowedRoles={['dudi']}><DudiDashboard /></ProtectedRoute>
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
