import { useState } from 'react';
import { LogOut, UserX, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BarcodeScanner from '../../components/BarcodeScanner';
import api from '../../api/axios';

export default function GuruDashboard() {
  const { user, logout } = useAuth();
  const [alpaMessage, setAlpaMessage] = useState('');
  const [alpaError, setAlpaError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleProcessAlpa = async () => {
    setProcessing(true);
    setAlpaMessage('');
    try {
      const res = await api.post('/attendance/process-alpa');
      setAlpaError(false);
      setAlpaMessage(res.data.message);
    } catch (err) {
      setAlpaError(true);
      setAlpaMessage(err.response?.data?.message || 'Gagal memproses alpa.');
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

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

      <div className="max-w-md mx-auto mt-6 surface-card p-4">
        <div className="flex items-start gap-2 mb-3">
          <UserX className="w-4 h-4 text-honey-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink-700">Proses Siswa Tidak Hadir (Alpa)</p>
            <p className="text-xs text-ink-400 mt-0.5">
              Jalankan ini setelah jam absen ditutup. Sistem akan menandai semua siswa yang belum scan hari ini sebagai "alpa" dan menambahkan poin pelanggarannya secara otomatis.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full text-sm font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 rounded-xl py-2 transition"
          >
            Proses Alpa Hari Ini
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-500">Yakin? Tindakan ini akan menambah poin pelanggaran untuk siswa yang belum absen hari ini.</p>
            <div className="flex gap-2">
              <button
                onClick={handleProcessAlpa}
                disabled={processing}
                className="flex-1 text-sm font-medium text-white bg-honey-500 hover:bg-honey-700 disabled:opacity-50 rounded-xl py-2 transition"
              >
                {processing ? 'Memproses...' : 'Ya, Proses Sekarang'}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 text-sm font-medium text-ink-500 hover:bg-mist-50 rounded-xl py-2 transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {alpaMessage && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
            alpaError ? 'bg-honey-50 text-honey-700 border border-honey-200' : 'bg-brand-50 text-brand-700 border border-brand-100'
          }`}>
            {alpaError
              ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{alpaMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
