import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ScanBarcode, ArrowLeft, Mail, Lock } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-[#0B1B3A] px-4 py-10 relative overflow-hidden">
      {/* dot grid decoration, senada dengan halaman utama */}
      <div
        className="absolute top-10 left-6 w-40 h-40 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #F2B705 1.5px, transparent 1.5px)',
          backgroundSize: '14px 14px',
        }}
      />
      <div
        className="absolute bottom-10 right-6 w-40 h-40 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #3FB27F 1.5px, transparent 1.5px)',
          backgroundSize: '14px 14px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium mb-6 transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#F2B705] via-[#15803D] to-[#0B1B3A]" />

          <div className="p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center mb-4 shadow-md">
                <ScanBarcode className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h1 className="font-display text-lg font-bold text-[#0B1B3A] text-center">
                SMK MUHAMMADIYAH SAMPIT
              </h1>
              <p className="text-xs text-ink-500 mt-1">Sistem Informasi Sekolah</p>
              <span className="mt-3 h-1 w-10 rounded-full bg-[#F2B705]" />
            </div>

            {error && (
              <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email" value={email} autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input pl-9 focus:border-[#15803D] focus:ring-[#15803D]/20"
                    placeholder="nama@sekolah.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input pl-9 focus:border-[#15803D] focus:ring-[#15803D]/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 text-white font-semibold text-sm px-4 py-3 rounded-xl transition"
              >
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          &ldquo; Berilmu, Beriman, Beramal &rdquo;
        </p>
      </div>
    </div>
  );
}
