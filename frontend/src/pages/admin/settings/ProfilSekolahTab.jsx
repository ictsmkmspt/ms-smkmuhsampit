import { useEffect, useRef, useState } from 'react';
import { Save, School, Image, Upload, PenTool, Stamp, Plus, CheckCircle2, Trash2, CalendarRange } from 'lucide-react';
import api from '../../../api/axios';
import { useSchoolProfile } from '../../../context/SchoolProfileContext';
import { useAuth } from '../../../context/AuthContext';

// Tahun Ajaran digabung ke Profil Sekolah (di atas Logo) — dulu punya menu
// sendiri (TahunAjaranTab.jsx, sekarang dihapus), tabel "Tambah" dan
// "Daftar" juga dulu terpisah 2 kartu, sekarang disatukan jadi 1 kartu.
// Reset Poin (fitur khusus pengembangan) ikut dipindah, tapi ke menu Mode
// Maintenance — lihat MaintenanceModeTab.jsx — bukan ke sini.
function TahunAjaranSection({ isAdmin }) {
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
    <div className="surface-card p-5">
      <h2 className="font-display font-semibold text-ink-900 flex items-center gap-1.5 mb-1">
        <CalendarRange className="w-4 h-4 text-brand-600" /> Tahun Ajaran <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
      </h2>
      <p className="text-xs text-ink-500 mb-4">
        Aktifkan tahun ajaran baru di awal tahun pelajaran supaya poin pelanggaran &amp; prestasi semua siswa mulai dari 0 lagi — <b>tanpa menghapus riwayat</b> tahun ajaran sebelumnya. Pelanggaran, prestasi, absensi, dan penempatan PKL baru otomatis tercatat masuk tahun ajaran yang sedang aktif.
      </p>

      {isAdmin && (
        <form onSubmit={handleAdd} className="mb-4">
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
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
      )}

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
                {isAdmin && ta.status !== 'aktif' && (
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
  );
}

export default function ProfilSekolahTab() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { profile, reload } = useSchoolProfile();
  const fileInputRef = useRef(null);
  const ttdInputRef = useRef(null);
  const capInputRef = useRef(null);

  const [form, setForm] = useState({ nama_sekolah: '', visi: '', misi: '', alamat: '', website: '', nama_kepala_sekolah: '', nip_kepala_sekolah: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadingTtd, setUploadingTtd] = useState(false);
  const [uploadErrorTtd, setUploadErrorTtd] = useState('');
  const [uploadingCap, setUploadingCap] = useState(false);
  const [uploadErrorCap, setUploadErrorCap] = useState('');

  useEffect(() => {
    setForm({
      nama_sekolah: profile.nama_sekolah || '',
      visi: profile.visi || '',
      misi: profile.misi || '',
      alamat: profile.alamat || '',
      website: profile.website || '',
      nama_kepala_sekolah: profile.nama_kepala_sekolah || '',
      nip_kepala_sekolah: profile.nip_kepala_sekolah || '',
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

  const handlePickTtd = () => ttdInputRef.current?.click();

  const handleTtdChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadErrorTtd('');
    setUploadingTtd(true);

    const formData = new FormData();
    formData.append('ttd', file);

    try {
      await api.post('/school-profile/ttd-kepala-sekolah', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      reload();
    } catch (err) {
      setUploadErrorTtd(err.response?.data?.message || 'Gagal mengunggah tanda tangan. Pastikan file berformat PNG (maks 2MB).');
    } finally {
      setUploadingTtd(false);
      e.target.value = '';
    }
  };

  const handlePickCap = () => capInputRef.current?.click();

  const handleCapChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadErrorCap('');
    setUploadingCap(true);

    const formData = new FormData();
    formData.append('cap', file);

    try {
      await api.post('/school-profile/cap-sekolah', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      reload();
    } catch (err) {
      setUploadErrorCap(err.response?.data?.message || 'Gagal mengunggah cap sekolah. Pastikan file berformat PNG (maks 2MB).');
    } finally {
      setUploadingCap(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Profil Sekolah hanya bisa dilihat di sini — perubahannya dikelola oleh Admin.</p>
        </div>
      )}

      <TahunAjaranSection isAdmin={isAdmin} />

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
          {isAdmin && (
            <div>
              <button
                type="button" onClick={handlePickLogo} disabled={uploading}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
              >
                <Upload className="w-4 h-4" /> {uploading ? 'Mengunggah...' : (profile.logo_url ? 'Ganti Logo' : 'Unggah Logo')}
              </button>
              <p className="text-xs text-ink-400 mt-1.5">Format gambar, maks 2MB.</p>
            </div>
          )}
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
            className="field-input" required maxLength={150} disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Visi</label>
          <textarea
            value={form.visi}
            onChange={(e) => setForm({ ...form, visi: e.target.value })}
            className="field-input" rows={3} maxLength={2000} disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Misi</label>
          <textarea
            value={form.misi}
            onChange={(e) => setForm({ ...form, misi: e.target.value })}
            className="field-input" rows={5} maxLength={4000}
            placeholder="Bisa ditulis per poin, satu baris satu poin."
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Alamat Sekolah</label>
          <input
            value={form.alamat}
            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            className="field-input" maxLength={300} disabled={!isAdmin}
            placeholder="Mis. Jl. Pendidikan No. 10, Kota Contoh"
          />
          <p className="text-xs text-ink-400 mt-1">Ditampilkan di Kartu Pelajar dan tempat lain yang menyertakan alamat sekolah.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Website Sekolah</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="field-input" maxLength={150} disabled={!isAdmin}
            placeholder="Mis. www.smkcontoh.sch.id"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Nama Kepala Sekolah</label>
          <input
            value={form.nama_kepala_sekolah}
            onChange={(e) => setForm({ ...form, nama_kepala_sekolah: e.target.value })}
            className="field-input" maxLength={150} disabled={!isAdmin}
            placeholder="Mis. Drs. Nama Kepala Sekolah, M.Pd."
          />
          <p className="text-xs text-ink-400 mt-1">Ditampilkan bersama tanda tangan &amp; cap sekolah di dokumen cetak resmi.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">NIP Kepala Sekolah</label>
          <input
            value={form.nip_kepala_sekolah}
            onChange={(e) => setForm({ ...form, nip_kepala_sekolah: e.target.value })}
            className="field-input" maxLength={30} disabled={!isAdmin}
            placeholder="Mis. 197001011999031001"
          />
        </div>

        {isAdmin && (
          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}
            </button>
            {saved && <span className="ml-3 text-sm text-brand-600 font-medium">✓ Tersimpan!</span>}
          </div>
        )}
      </form>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Tanda Tangan Kepala Sekolah</h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Dipakai untuk membubuhkan tanda tangan otomatis di dokumen cetak resmi. Wajib format PNG (latar belakang transparan).
        </p>
        {uploadErrorTtd && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{uploadErrorTtd}</p>}
        <div className="flex items-center gap-4">
          <div className="w-32 h-20 rounded-xl border border-line-200 bg-mist-50 flex items-center justify-center overflow-hidden shrink-0">
            {profile.ttd_kepala_sekolah_url ? (
              <img src={profile.ttd_kepala_sekolah_url} alt="Tanda Tangan Kepala Sekolah" className="w-full h-full object-contain" />
            ) : (
              <PenTool className="w-8 h-8 text-ink-300" />
            )}
          </div>
          {isAdmin && (
            <div>
              <button
                type="button" onClick={handlePickTtd} disabled={uploadingTtd}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
              >
                <Upload className="w-4 h-4" /> {uploadingTtd ? 'Mengunggah...' : (profile.ttd_kepala_sekolah_url ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan')}
              </button>
              <p className="text-xs text-ink-400 mt-1.5">Format PNG, maks 2MB.</p>
            </div>
          )}
          <input
            ref={ttdInputRef} type="file" accept="image/png"
            onChange={handleTtdChange} className="hidden"
          />
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Stamp className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Cap Sekolah</h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Dipakai untuk membubuhkan cap otomatis di dokumen cetak resmi. Wajib format PNG (latar belakang transparan).
        </p>
        {uploadErrorCap && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{uploadErrorCap}</p>}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-line-200 bg-mist-50 flex items-center justify-center overflow-hidden shrink-0">
            {profile.cap_sekolah_url ? (
              <img src={profile.cap_sekolah_url} alt="Cap Sekolah" className="w-full h-full object-contain" />
            ) : (
              <Stamp className="w-8 h-8 text-ink-300" />
            )}
          </div>
          {isAdmin && (
            <div>
              <button
                type="button" onClick={handlePickCap} disabled={uploadingCap}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
              >
                <Upload className="w-4 h-4" /> {uploadingCap ? 'Mengunggah...' : (profile.cap_sekolah_url ? 'Ganti Cap Sekolah' : 'Unggah Cap Sekolah')}
              </button>
              <p className="text-xs text-ink-400 mt-1.5">Format PNG, maks 2MB.</p>
            </div>
          )}
          <input
            ref={capInputRef} type="file" accept="image/png"
            onChange={handleCapChange} className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
