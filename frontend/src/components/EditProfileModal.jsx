import { useState } from 'react';
import { X, User as UserIcon, KeyRound } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  admin: 'Super Admin',
  waka: 'Admin',
  waka_kesiswaan: 'Waka Kesiswaan',
  waka_kurikulum: 'Waka Kurikulum',
  waka_humas: 'Waka Humas',
  waka_sarpras: 'Waka Sarpras',
  guru: 'Guru',
  siswa: 'Siswa',
  wali: 'Wali Siswa',
  dudi: 'IDUKA',
  tu: 'Tata Usaha',
};

/**
 * Modal "Profil" generik — dipakai bareng Admin, Guru, Siswa, Wali, TU.
 * Sengaja cuma buat LIHAT data diri (tidak bisa diedit dari sini) + ganti
 * password. Perubahan nama/data lain (kalau perlu) tetap lewat admin.
 * DUDI punya versinya sendiri (DudiProfileModal + TandaTanganModal).
 */
export default function EditProfileModal({ onClose }) {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSukses, setPasswordSukses] = useState('');

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSukses('');
    setSavingPassword(true);
    try {
      const res = await api.put('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setPasswordSukses(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setPasswordError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengganti password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
          <h3 className="font-display font-semibold text-ink-900">Profil</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* Data Diri (lihat saja) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-4 h-4 text-brand-600" />
              <h4 className="font-display font-semibold text-sm text-ink-900">Data Diri</h4>
            </div>
            <dl className="text-sm space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Nama</dt>
                <dd className="text-ink-900 font-medium text-right truncate">{user.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">{user.email ? 'Email' : 'No. HP'}</dt>
                <dd className="text-ink-900 font-medium text-right truncate">{user.email || user.phone || '-'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Peran</dt>
                <dd className="text-ink-900 font-medium text-right">{ROLE_LABEL[user.role] || user.role}</dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-line-200" />

          <form onSubmit={handleSavePassword} className="space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-brand-600" />
              <h4 className="font-display font-semibold text-sm text-ink-900">Ganti Password</h4>
            </div>
            {passwordError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{passwordError}</p>}
            {passwordSukses && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">{passwordSukses}</p>}
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Password Saat Ini</label>
              <input
                type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="field-input" required autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Password Baru</label>
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="field-input" required minLength={8}
                pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Minimal 8 karakter, wajib ada huruf besar dan simbol"
                autoComplete="new-password"
              />
              <p className="text-[11px] text-ink-400 mt-1">Minimal 8 karakter, wajib ada huruf besar dan simbol (mis. ! @ # $).</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Ulangi Password Baru</label>
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="field-input" required minLength={8} autoComplete="new-password"
              />
            </div>
            <button disabled={savingPassword} className="btn-primary w-full justify-center">
              {savingPassword ? 'Menyimpan...' : 'Ganti Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
