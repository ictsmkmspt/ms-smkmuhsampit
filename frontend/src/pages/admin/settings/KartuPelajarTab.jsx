import { useEffect, useState } from 'react';
import { Save, IdCard, FileText } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { useSchoolProfile } from '../../../context/SchoolProfileContext';

const WARNA_DEFAULT = {
  warna_utama: '#0B1B3A', warna_aksen: '#F2B705', warna_abu: '#94A3B8',
  judul_belakang: '', ketentuan: '',
};

// Pengaturan 3 warna Kartu Pelajar — dulu diedit langsung di halaman cetak
// lewat localStorage (per perangkat), sekarang dipusatkan di sini lewat
// Setting supaya semua yang mencetak (siapa pun akunnya) pakai warna yang
// sama. Halaman cetak (PrintKartuPelajar) cuma MEMBACA nilai ini.
export default function KartuPelajarTab() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { profile } = useSchoolProfile();

  const [form, setForm] = useState(WARNA_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/kartu-pelajar-pengaturan').then((res) => setForm(res.data));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await api.put('/kartu-pelajar-pengaturan', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Pengaturan Kartu Pelajar hanya bisa dilihat di sini — perubahannya dikelola oleh Admin.</p>
        </div>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <IdCard className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Warna Kartu Pelajar</h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Berlaku untuk semua Kartu Pelajar yang dicetak (menu Master Data &gt; Siswa &gt; Cetak Kartu Pelajar), sisi depan maupun belakang.
        </p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-ink-500">Warna Utama</span>
            <input type="color" value={form.warna_utama} onChange={(e) => setForm({ ...form, warna_utama: e.target.value })} disabled={!isAdmin} className="w-12 h-12 border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed" />
          </label>
          <label className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-ink-500">Warna Aksen</span>
            <input type="color" value={form.warna_aksen} onChange={(e) => setForm({ ...form, warna_aksen: e.target.value })} disabled={!isAdmin} className="w-12 h-12 border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed" />
          </label>
          <label className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-ink-500">Warna Abu-abu</span>
            <input type="color" value={form.warna_abu} onChange={(e) => setForm({ ...form, warna_abu: e.target.value })} disabled={!isAdmin} className="w-12 h-12 border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed" />
          </label>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {saved && <span className="text-sm text-brand-600 font-medium">✓ Tersimpan!</span>}
            </div>
          )}
        </form>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Pratinjau</h2>
        <div className="kpv-kartu" style={{ '--utama': form.warna_utama, '--aksen': form.warna_aksen, '--abu': form.warna_abu }}>
          <div className="kpv-header">
            <div className="kpv-avatar">
              {profile?.logo_url ? <img src={profile.logo_url} alt="" className="kpv-avatar-img" /> : (profile?.nama_sekolah?.charAt(0)?.toUpperCase() || 'S')}
            </div>
            <div>
              <p className="kpv-sekolah">{profile?.nama_sekolah}</p>
              <p className="kpv-label">kartu pelajar</p>
            </div>
          </div>
          <div className="kpv-body">
            <div className="kpv-foto" />
            <p className="kpv-nama">Nama Peserta Didik</p>
            <p className="kpv-nis">NIS 0000000000</p>
          </div>
          <div className="kpv-bar" />
        </div>

        <style>{`
          .kpv-kartu {
            width: 44mm;
            border: 1px solid #E2E8F0;
            border-radius: 3mm;
            overflow: hidden;
            background: #fff;
          }
          .kpv-header {
            background: var(--utama);
            padding: 2.5mm;
            display: flex;
            align-items: center;
            gap: 2mm;
          }
          .kpv-avatar {
            width: 8mm;
            height: 8mm;
            border-radius: 50%;
            background: var(--aksen);
            color: var(--utama);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            flex-shrink: 0;
            overflow: hidden;
          }
          .kpv-avatar-img { width: 100%; height: 100%; object-fit: contain; background: #fff; border-radius: 50%; padding: 0.6mm; box-sizing: border-box; }
          .kpv-sekolah { color: #fff; font-size: 7.5px; font-weight: 700; line-height: 1.2; }
          .kpv-label { color: var(--aksen); font-size: 6px; font-weight: 600; margin-top: 0.3mm; }
          .kpv-body { padding: 3mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .kpv-foto { width: 14mm; height: 14mm; border-radius: 2mm; background: #F1F5F9; border: 1px solid #E2E8F0; margin-bottom: 1.5mm; }
          .kpv-nama { font-size: 8.5px; font-weight: 800; color: #0f172a; }
          .kpv-nis { font-size: 6.5px; color: var(--abu); margin-top: 0.3mm; }
          .kpv-bar { height: 2mm; background: var(--aksen); }
        `}</style>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Teks Sisi Belakang</h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">Judul &amp; daftar ketentuan yang tampil di sisi belakang Kartu Pelajar.</p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Judul</label>
            <input
              value={form.judul_belakang}
              onChange={(e) => setForm({ ...form, judul_belakang: e.target.value })}
              className="field-input" required maxLength={100} disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Ketentuan</label>
            <textarea
              value={form.ketentuan}
              onChange={(e) => setForm({ ...form, ketentuan: e.target.value })}
              className="field-input" rows={5} maxLength={2000} disabled={!isAdmin}
              placeholder="Satu baris satu poin."
            />
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {saved && <span className="text-sm text-brand-600 font-medium">✓ Tersimpan!</span>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
