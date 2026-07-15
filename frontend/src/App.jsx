import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuruDashboard from './pages/guru/GuruDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import ParentDashboard from './pages/wali/ParentDashboard';
import PrintMonthlyAttendance from './pages/print/PrintMonthlyAttendance';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/print/absensi-bulanan" element={
            <ProtectedRoute allowedRoles={['admin', 'guru']}><PrintMonthlyAttendance /></ProtectedRoute>
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

          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
