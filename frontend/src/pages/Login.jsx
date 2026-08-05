import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchoolProfile } from '../context/SchoolProfileContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { profile } = useSchoolProfile();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'waka' || user.role.startsWith('waka_')) navigate('/admin');
      else if (user.role === 'guru') navigate('/guru');
      else if (user.role === 'wali') navigate('/wali');
      else if (user.role === 'dudi') navigate('/dudi');
      else if (user.role === 'tu') navigate('/tu');
      else navigate('/siswa');
    } catch {
      setError('Email/No. HP atau password salah.');
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
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#F2B705] via-[#15803D] to-[#0B1B3A]" />

          <div className="p-8">
            <div className="flex flex-col items-center mb-6">
              {profile.logo_url && (
                <img src={profile.logo_url} alt="Logo Sekolah" className="w-16 h-16 object-contain mb-3" />
              )}
              <h1 className="font-display text-lg font-bold text-[#0B1B3A] text-center">
                {profile.nama_sekolah.toUpperCase()}
              </h1>
              <p className="text-xs text-ink-500 mt-1">Sistem Informasi Sekolah</p>
              {profile.tahun_ajaran && (
                <p className="text-xs text-ink-400 mt-0.5">Tahun Ajaran {profile.tahun_ajaran}</p>
              )}
              <span className="mt-3 h-1 w-10 rounded-full bg-[#F2B705]" />
            </div>

            {error && (
              <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Email atau No. HP</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text" value={identifier} autoFocus
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="field-input pl-9 focus:border-[#15803D] focus:ring-[#15803D]/20"
                    placeholder="nama@sekolah.com atau 08xxxxxxxxxx"
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
