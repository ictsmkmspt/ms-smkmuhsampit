import { useEffect, useRef, useState } from 'react';
import { Save, School, Image, Upload } from 'lucide-react';
import api from '../../../api/axios';
import { useSchoolProfile } from '../../../context/SchoolProfileContext';

export default function ProfilSekolahTab() {
  const { profile, reload } = useSchoolProfile();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ nama_sekolah: '', visi: '', misi: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setForm({
      nama_sekolah: profile.nama_sekolah || '',
      visi: profile.visi || '',
      misi: profile.misi || '',
    });
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await api.put('/school-profile', form);
      reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan profil sekolah.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickLogo = () => fileInputRef.current?.click();

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      await api.post('/school-profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      reload();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Gagal mengunggah logo. Pastikan file berupa gambar (maks 2MB).');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Logo Sekolah</h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Logo ini otomatis dipakai sebagai ikon tab browser, logo di halaman Login, dan di sidebar dashboard Admin &amp; TU.
        </p>

        {uploadError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{uploadError}</p>}

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-line-200 bg-mist-50 flex items-center justify-center overflow-hidden shrink-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-full h-full object-contain" />
            ) : (
              <School className="w-8 h-8 text-ink-300" />
            )}
          </div>
          <div>
            <button
              type="button" onClick={handlePickLogo} disabled={uploading}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
            >
              <Upload className="w-4 h-4" /> {uploading ? 'Mengunggah...' : (profile.logo_url ? 'Ganti Logo' : 'Unggah Logo')}
            </button>
            <p className="text-xs text-ink-400 mt-1.5">Format gambar, maks 2MB.</p>
          </div>
          <input
            ref={fileInputRef} type="file" accept="image/*"
            onChange={handleLogoChange} className="hidden"
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="surface-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-ink-900">Nama, Visi &amp; Misi</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Nama Sekolah</label>
          <input
            value={form.nama_sekolah}
            onChange={(e) => setForm({ ...form, nama_sekolah: e.target.value })}
            className="field-input" required maxLength={150}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Visi</label>
          <textarea
            value={form.visi}
            onChange={(e) => setForm({ ...form, visi: e.target.value })}
            className="field-input" rows={3} maxLength={2000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Misi</label>
          <textarea
            value={form.misi}
            onChange={(e) => setForm({ ...form, misi: e.target.value })}
            className="field-input" rows={5} maxLength={4000}
            placeholder="Bisa ditulis per poin, satu baris satu poin."
          />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}
          </button>
          {saved && <span className="ml-3 text-sm text-brand-600 font-medium">✓ Tersimpan!</span>}
        </div>
      </form>
    </div>
  );
}
