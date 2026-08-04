import { useEffect, useRef, useState } from 'react';
import { Save, School, Image, Upload, Plus, CheckCircle2, Trash2, CalendarRange, Info, Download, DatabaseBackup, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';
import { useSchoolProfile } from '../../../context/SchoolProfileContext';
import { useAuth } from '../../../context/AuthContext';

export default function ProfilSekolahTab() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
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
      {!isAdmin && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Profil Sekolah &amp; Tahun Ajaran hanya bisa dilihat di sini — perubahannya dikelola oleh Admin.</p>
        </div>
      )}

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

      <TahunAjaranSection isAdmin={isAdmin} />

      {isAdmin && <BackupSection />}
    </div>
  );
}

function BackupSection() {
  const { profile } = useSchoolProfile();
  const fileInputRef = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const [file, setFile] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const handleDownload = async () => {
    setDownloadError('');
    setDownloading(true);
    try {
      const res = await api.get('/system/backup', { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'backup-database.sql';

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Gagal membuat backup. Coba lagi, atau hubungi teknisi kalau terus gagal.');
    } finally {
      setDownloading(false);
    }
  };

  const namaSekolah = profile.nama_sekolah || '';
  const konfirmasiCocok = konfirmasi.trim() !== '' && konfirmasi.trim() === namaSekolah.trim();

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setRestoreError('');
    setRestoreSuccess('');
  };

  const handleRestore = async () => {
    if (!file || !konfirmasiCocok) return;
    if (!confirm(
      `PERINGATAN: Ini akan MENGHAPUS TOTAL seluruh data sekolah saat ini dan menggantinya dengan isi file "${file.name}".\n\n` +
      `Aksi ini TIDAK BISA DIBATALKAN dari sini. Sistem akan membuat backup pengaman di server sebelum menimpa, tapi tetap pastikan file yang Anda upload benar.\n\n` +
      `Lanjutkan impor sekarang?`
    )) return;

    setRestoreError('');
    setRestoreSuccess('');
    setRestoring(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('konfirmasi_nama_sekolah', konfirmasi.trim());

    try {
      const res = await api.post('/system/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreSuccess(res.data.message);
      setFile(null);
      setKonfirmasi('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setRestoreError(err.response?.data?.message || 'Gagal mengimpor database.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="surface-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <DatabaseBackup className="w-4 h-4 text-brand-600" />
        <h2 className="font-display font-semibold text-ink-900">Backup &amp; Impor Database</h2>
      </div>

      {/* Backup */}
      <div>
        <p className="text-sm font-medium text-ink-700 mb-1">Backup</p>
        <p className="text-xs text-ink-500 mb-3">
          Unduh salinan lengkap database sekolah saat ini (semua data: siswa, guru, absensi, SPP, dst). Simpan file ini di tempat aman.
        </p>
        {downloadError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{downloadError}</p>}
        <button
          onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
        >
          <Download className="w-4 h-4" /> {downloading ? 'Membuat backup...' : 'Download Backup'}
        </button>
      </div>

      {/* Impor */}
      <div className="pt-4 border-t border-line-200">
        <p className="text-sm font-medium text-ink-700 mb-1">Impor (Timpa Total Database)</p>

        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">
            <b>Berbahaya.</b> Ini akan MENGHAPUS SEMUA data sekolah yang ada sekarang dan menggantinya total dengan isi file backup yang diupload. Tidak bisa dibatalkan dari halaman ini. Pastikan file-nya benar sebelum lanjut.
          </p>
        </div>

        {restoreError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{restoreError}</p>}
        {restoreSuccess && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">{restoreSuccess}</p>}

        <div className="space-y-3">
          <input
            ref={fileInputRef} type="file" accept=".sql,.sqlite"
            onChange={handleFileChange}
            className="field-input text-sm"
          />

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">
              Ketik ulang nama sekolah (<b>{namaSekolah}</b>) untuk konfirmasi
            </label>
            <input
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              className="field-input"
              placeholder={namaSekolah}
            />
          </div>

          <button
            onClick={handleRestore}
            disabled={!file || !konfirmasiCocok || restoring}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl px-4 py-2 transition"
          >
            <Upload className="w-4 h-4" /> {restoring ? 'Mengimpor...' : 'Timpa Database Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <>
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Aktifkan tahun ajaran baru di awal tahun pelajaran supaya poin pelanggaran &amp; prestasi semua siswa mulai dari 0 lagi — <b>tanpa menghapus riwayat</b> tahun ajaran sebelumnya. Pelanggaran, prestasi, absensi, dan penempatan PKL baru otomatis tercatat masuk tahun ajaran yang sedang aktif.
        </p>
      </div>

      {isAdmin && (
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
      )}

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
    </>
  );
}
