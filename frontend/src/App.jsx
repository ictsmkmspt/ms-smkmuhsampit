import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SchoolProfileProvider } from './context/SchoolProfileContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import PpdbPublic from './pages/PpdbPublic';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuruDashboard from './pages/guru/GuruDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import ParentDashboard from './pages/wali/ParentDashboard';
import DudiDashboard from './pages/dudi/DudiDashboard';
import TuDashboard from './pages/tu/TuDashboard';
import RoomStaffDashboard from './pages/sarpras-staff/RoomStaffDashboard';
import BkDashboard from './pages/bk/BkDashboard';
import PrintMonthlyAttendance from './pages/print/PrintMonthlyAttendance';
import PrintPklJurnal from './pages/print/PrintPklJurnal';
import PrintPklJurnalKegiatan from './pages/print/PrintPklJurnalKegiatan';
import PrintPklPembimbingan from './pages/print/PrintPklPembimbingan';
import PrintSppNota from './pages/print/PrintSppNota';
import PrintTagihanLainNota from './pages/print/PrintTagihanLainNota';
import PrintKalenderAkademik from './pages/print/PrintKalenderAkademik';
import PrintAssetLabels from './pages/print/PrintAssetLabels';

export default function App() {
  return (
    <SchoolProfileProvider>
      <AuthProvider>
        <BrowserRouter>
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

            <Route path="*" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SchoolProfileProvider>
  );
}
