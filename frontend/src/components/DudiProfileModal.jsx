import { useState } from 'react';
import { X, User as UserIcon, KeyRound, Pencil, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * Modal "Edit Profil" untuk DUDI — beda dari modal generik role lain karena
 * datanya gabungan User (nama instruktur) + Dudi (nama perusahaan, alamat,
 * no HP). Sengaja cuma "Nama Instruktur" & "No. HP" yang bisa diedit sendiri
 * di sini — nama perusahaan & alamat tetap data resmi yang dikelola admin
 * lewat Master Data > DUDI. Tanda tangan punya menu sendiri (TandaTanganModal),
 * tidak lagi digabung ke sini.
 */
export default function DudiProfileModal({ dudi, onClose, onSaved }) {
  const { updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(dudi?.user?.name || '');
  const [telepon, setTelepon] = useState(dudi?.telepon || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setName(dudi?.user?.name || '');
    setTelepon(dudi?.telepon || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/dudi/profile', { name, telepon });
      updateUser({ name: res.data.dudi.user.name });
      onSaved?.(res.data.dudi);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

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
          {/* Data Diri */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-brand-600" />
                <h4 className="font-display font-semibold text-sm text-ink-900">Data Diri</h4>
              </div>
              {!editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 transition"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

            {editing ? (
              <form onSubmit={handleSave} className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Nama Instruktur</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="field-input text-sm" required maxLength={100} autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">No. HP (dipakai untuk login)</label>
                  <input
                    value={telepon} onChange={(e) => setTelepon(e.target.value)}
                    className="field-input text-sm" maxLength={30} required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                    <Check className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button" onClick={() => setEditing(false)}
                    className="text-sm font-medium text-ink-500 hover:text-ink-700 px-4 rounded-xl border border-line-200"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <dl className="text-sm space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Nama Instruktur</dt>
                  <dd className="text-ink-900 font-medium text-right truncate">{dudi?.user?.name || '-'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">No. HP</dt>
                  <dd className="text-ink-900 font-medium text-right truncate">{dudi?.telepon || '-'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Nama Perusahaan</dt>
                  <dd className="text-ink-900 font-medium text-right truncate">{dudi?.nama_perusahaan || '-'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Alamat</dt>
                  <dd className="text-ink-900 font-medium text-right truncate">{dudi?.alamat || '-'}</dd>
                </div>
              </dl>
            )}
            {!editing && (
              <p className="text-xs text-ink-400 mt-2">Nama perusahaan & alamat dikelola oleh admin sekolah.</p>
            )}
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
                className="field-input text-sm" required autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Password Baru</label>
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="field-input text-sm" required minLength={8}
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
                className="field-input text-sm" required minLength={8} autoComplete="new-password"
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
