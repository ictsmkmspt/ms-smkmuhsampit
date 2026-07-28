import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Landing from './pages/Landing';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuruDashboard from './pages/guru/GuruDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import ParentDashboard from './pages/wali/ParentDashboard';
import DudiDashboard from './pages/dudi/DudiDashboard';
import PrintMonthlyAttendance from './pages/print/PrintMonthlyAttendance';
import PrintPklJurnal from './pages/print/PrintPklJurnal';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route path="/print/absensi-bulanan" element={
            <ProtectedRoute allowedRoles={['admin', 'guru']}><PrintMonthlyAttendance /></ProtectedRoute>
          } />

          <Route path="/print/pkl-jurnal" element={
            <ProtectedRoute allowedRoles={['admin', 'guru', 'dudi', 'siswa']}><PrintPklJurnal /></ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
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

          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
