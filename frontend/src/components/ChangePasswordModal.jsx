import { useState } from 'react';
import { X, KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

/**
 * Modal ganti password akun sendiri — dipakai bersama semua peran
 * (Guru, Siswa, IDUKA, dst) lewat 1 endpoint umum (/me/password).
 * Ada mode "forced" (dipakai saat wajib ganti password default) yang
 * tidak bisa ditutup sebelum berhasil.
 */
export default function ChangePasswordModal({ onClose, forced = false, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sukses, setSukses] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSukses('');
    setSaving(true);
    try {
      const res = await api.put('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setSukses(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (forced && onSuccess) {
        setTimeout(() => onSuccess(), 800);
      }
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengganti password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={forced ? undefined : onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-600" />
            <h3 className="font-display font-semibold text-ink-900">Ganti Password</h3>
          </div>
          {!forced && (
            <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {forced && (
            <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">
              Password Anda masih menggunakan kata sandi default (123456). Untuk keamanan akun, wajib diganti dulu sebelum melanjutkan.
            </p>
          )}
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          {sukses && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">{sukses}</p>}

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Password Saat Ini</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="field-input pr-9" required autoComplete="current-password"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Password Baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="field-input pr-9" required minLength={8}
                pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Minimal 8 karakter, wajib ada huruf besar dan simbol"
                autoComplete="new-password"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-ink-400 mt-1">Minimal 8 karakter, wajib ada huruf besar dan simbol (mis. ! @ # $).</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Ulangi Password Baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="field-input pr-9" required minLength={8} autoComplete="new-password"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button disabled={saving} className="btn-primary w-full justify-center mt-1">
            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
