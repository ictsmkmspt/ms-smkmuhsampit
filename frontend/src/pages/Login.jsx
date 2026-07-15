import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanBarcode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'guru') navigate('/guru');
      else if (user.role === 'wali') navigate('/wali');
      else navigate('/siswa');
    } catch (err) {
      setError('Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist-50 px-4">
      <div className="w-full max-w-sm">
        <div className="surface-card p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
              <ScanBarcode className="w-6 h-6 text-brand-600" strokeWidth={2} />
            </div>
            <h1 className="font-display text-xl font-semibold text-ink-900">Absensi Siswa</h1>
            <span className="mt-2 h-1 w-10 rounded-full bg-honey-400" />
          </div>

          {error && (
            <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Email</label>
              <input
                type="email" value={email} autoFocus
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                placeholder="nama@sekolah.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Password</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-ink-500 mt-5">
          Sistem absensi berbasis barcode
        </p>
      </div>
    </div>
  );
}
