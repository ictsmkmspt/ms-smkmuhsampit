import { useEffect, useRef, useState } from 'react';
import { Save, School, Image, Upload, Plus, CheckCircle2, Trash2, CalendarRange, Info } from 'lucide-react';
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

      <TahunAjaranSection />
    </div>
  );
}

function TahunAjaranSection() {
  const { reload: reloadSchoolProfile } = useSchoolProfile();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/tahun-ajaran').then((res) => setList(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    const namaTrim = nama.trim();
    if (!/^\d{4}\/\d{4}$/.test(namaTrim)) {
      setError('Format nama tahun ajaran harus "YYYY/YYYY", contoh: 2027/2028.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/tahun-ajaran', { nama: namaTrim });
      setNama('');
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah tahun ajaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleAktifkan = async (ta) => {
    if (!confirm(`Aktifkan tahun ajaran "${ta.nama}"? Poin pelanggaran & prestasi semua siswa akan disesuaikan ke riwayat tahun ajaran ini (tidak ada data yang dihapus).`)) return;
    setBusyId(ta.id);
    try {
      const res = await api.post(`/tahun-ajaran/${ta.id}/aktifkan`);
      alert(res.data.message);
      load();
      reloadSchoolProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (ta) => {
    if (!confirm(`Hapus tahun ajaran "${ta.nama}"? Hanya bisa dihapus kalau tahun ajaran ini belum punya riwayat pelanggaran/prestasi/absensi/PKL sama sekali.`)) return;
    setBusyId(ta.id);
    try {
      await api.delete(`/tahun-ajaran/${ta.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus tahun ajaran.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Aktifkan tahun ajaran baru di awal tahun pelajaran supaya poin pelanggaran &amp; prestasi semua siswa mulai dari 0 lagi — <b>tanpa menghapus riwayat</b> tahun ajaran sebelumnya. Pelanggaran, prestasi, absensi, dan penempatan PKL baru otomatis tercatat masuk tahun ajaran yang sedang aktif.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Tahun Ajaran</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <input
            placeholder="Contoh: 2027/2028"
            value={nama} onChange={(e) => setNama(e.target.value)}
            className="field-input flex-1" required
          />
          <button disabled={saving} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Tahun Ajaran <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
        </h2>

        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : list.length === 0 ? (
          <p className="text-center text-ink-300 py-6">Belum ada tahun ajaran.</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {list.map((ta) => (
              <li key={ta.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CalendarRange className="w-4 h-4 text-ink-400" />
                  <span className="text-ink-900 font-medium">{ta.nama}</span>
                  {ta.status === 'aktif' && (
                    <span className="badge-soft badge-brand flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Aktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {ta.status !== 'aktif' && (
                    <>
                      <button
                        onClick={() => handleAktifkan(ta)}
                        disabled={busyId !== null}
                        className="text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 rounded-lg px-3 py-1.5 transition"
                      >
                        Aktifkan
                      </button>
                      <button
                        onClick={() => handleDelete(ta)}
                        disabled={busyId !== null}
                        className="text-ink-300 hover:text-honey-700 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
