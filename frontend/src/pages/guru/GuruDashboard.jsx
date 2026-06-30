import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BarcodeScanner from '../../components/BarcodeScanner';

export default function GuruDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-mist-50 p-6">
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <div>
          <p className="text-xs text-ink-500">Guru</p>
          <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </div>

      <p className="text-center text-sm text-ink-500 mb-4">Arahkan kamera ke barcode siswa</p>
      <BarcodeScanner />
    </div>
  );
}
