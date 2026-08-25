import { useEffect, useRef, useState } from 'react';
import { Save, ImagePlus, UserRound, CheckCircle2, AlertCircle, Plus, X, FileText, Award, Trash2, IdCard } from 'lucide-react';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';

const FORM_KOSONG = {
  nik: '', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '', agama: '',
  tinggi_badan: '', berat_badan: '', status_pernikahan: '', keahlian: [], pengalaman_kerja: '',
};

function Field({ label, span, required, children }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-[11px] font-medium text-ink-500 mb-1">
        {label}{required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Biodata alumni (bagian fitur BKK) — menu default dashboard Alumni.
 * Field yang ditandai wajib DICEK Student::getBiodataLengkapAttribute()
 * di backend, harus lengkap semua sebelum tombol "Lamar" di menu Lowongan
 * aktif (lihat LokerTab.jsx & JobApplicationController::store()).
 */
export default function BiodataTab({ profile, onUpdated }) {
  const [form, setForm] = useState(FORM_KOSONG);
  const [keahlianBaru, setKeahlianBaru] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ktpFile, setKtpFile] = useState(null);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [hapusKtpLoading, setHapusKtpLoading] = useState(false);

  const [cvFile, setCvFile] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [hapusCvLoading, setHapusCvLoading] = useState(false);

  const [namaSertifikatBaru, setNamaSertifikatBaru] = useState('');
  const [fileSertifikatBaru, setFileSertifikatBaru] = useState(null);
  const [uploadingSertifikat, setUploadingSertifikat] = useState(false);
  const [hapusSertifikatId, setHapusSertifikatId] = useState(null);
  const sertifikatInputRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      nik: profile.nik || '', tempat_lahir: profile.tempat_lahir || '', tanggal_lahir: profile.tanggal_lahir || '',
      alamat: profile.alamat || '', no_telp: profile.no_telp || '', agama: profile.agama || '',
      tinggi_badan: profile.tinggi_badan ?? '', berat_badan: profile.berat_badan ?? '',
      status_pernikahan: profile.status_pernikahan || '', keahlian: profile.keahlian || [], pengalaman_kerja: profile.pengalaman_kerja || '',
    });
  }, [profile]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const tambahKeahlian = () => {
    const nilai = keahlianBaru.trim();
    if (!nilai || form.keahlian.includes(nilai)) return;
    setForm((f) => ({ ...f, keahlian: [...f.keahlian, nilai] }));
    setKeahlianBaru('');
  };

  const hapusKeahlian = (nilai) => {
    setForm((f) => ({ ...f, keahlian: f.keahlian.filter((k) => k !== nilai) }));
  };

  const pilihFoto = (file) => {
    setFotoFile(file);
    setFotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleUploadKtp = async (file) => {
    if (!file) return;
    setKtpFile(file);
    setUploadingKtp(true);
    try {
      const fd = new FormData();
      fd.append('ktp', file);
      const res = await api.post('/my-biodata/ktp', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunggah KTP.');
    } finally {
      setUploadingKtp(false);
      setKtpFile(null);
    }
  };

  const handleHapusKtp = async () => {
    if (!confirm('Hapus KTP yang sudah diunggah?')) return;
    setHapusKtpLoading(true);
    try {
      const res = await api.delete('/my-biodata/ktp');
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus KTP.');
    } finally {
      setHapusKtpLoading(false);
    }
  };

  const handleUploadCv = async (file) => {
    if (!file) return;
    setCvFile(file);
    setUploadingCv(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      const res = await api.post('/my-biodata/cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunggah CV.');
    } finally {
      setUploadingCv(false);
      setCvFile(null);
    }
  };

  const handleHapusCv = async () => {
    if (!confirm('Hapus CV yang sudah diunggah?')) return;
    setHapusCvLoading(true);
    try {
      const res = await api.delete('/my-biodata/cv');
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus CV.');
    } finally {
      setHapusCvLoading(false);
    }
  };

  const handleUploadSertifikat = async () => {
    if (!fileSertifikatBaru || !namaSertifikatBaru.trim()) return;
    setUploadingSertifikat(true);
    try {
      const fd = new FormData();
      fd.append('file', fileSertifikatBaru);
      fd.append('nama', namaSertifikatBaru.trim());
      const res = await api.post('/my-biodata/sertifikat', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated?.(res.data);
      setNamaSertifikatBaru('');
      setFileSertifikatBaru(null);
      if (sertifikatInputRef.current) sertifikatInputRef.current.value = '';
    } catch (err) {
      const msgs = err.response?.data?.errors;
      alert(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengunggah sertifikat.');
    } finally {
      setUploadingSertifikat(false);
    }
  };

  const handleHapusSertifikat = async (id) => {
    if (!confirm('Hapus sertifikat ini?')) return;
    setHapusSertifikatId(id);
    try {
      const res = await api.delete(`/my-biodata/sertifikat/${id}`);
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus sertifikat.');
    } finally {
      setHapusSertifikatId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await api.put('/my-biodata', form);
      let updated = res.data;
      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        const resFoto = await api.post('/my-biodata/foto', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        updated = resFoto.data;
      }
      setFotoFile(null);
      setFotoPreview(null);
      setSaved(true);
      onUpdated?.(updated);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const fotoTampil = fotoPreview || profile?.foto_url;
  const lengkap = profile?.biodata_lengkap;

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 pb-4">
      {lengkap ? (
        <div className="surface-card p-3 border-l-4 border-l-brand-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm text-ink-700">Biodata kamu sudah lengkap — kamu bisa melamar lowongan.</p>
        </div>
      ) : (
        <div className="surface-card p-3 border-l-4 border-l-honey-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-honey-500 shrink-0" />
          <p className="text-sm text-ink-700">Lengkapi biodata di bawah ini dulu sebelum bisa melamar lowongan.</p>
        </div>
      )}

      {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">Biodata tersimpan.</p>}

      <div className="surface-card p-4 flex items-center gap-4">
        {fotoTampil ? (
          <img src={fotoTampil} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-mist-50 flex items-center justify-center shrink-0">
            <UserRound className="w-7 h-7 text-ink-300" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900">Foto Diri <span className="text-rose-600">*</span></p>
          <label className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand-700 cursor-pointer w-fit">
            <ImagePlus className="w-3.5 h-3.5" /> {fotoTampil ? 'Ganti Foto' : 'Unggah Foto'}
            <input type="file" accept="image/*" onChange={(e) => pilihFoto(e.target.files[0] || null)} className="hidden" />
          </label>
        </div>
      </div>

      <div className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm text-ink-900 mb-3">Data Diri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="NIK" required><input value={form.nik} onChange={set('nik')} className="field-input w-full text-sm" /></Field>
          <Field label="Agama" required>
            <select value={form.agama} onChange={set('agama')} className="field-input w-full text-sm text-ink-700">
              <option value="">—</option>
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen (Protestan)</option>
              <option value="Katolik">Katolik</option>
              <option value="Hindu">Hindu</option>
              <option value="Buddha">Buddha</option>
              <option value="Konghucu">Konghucu</option>
              <option value="Penghayat Kepercayaan">Penghayat Kepercayaan</option>
            </select>
          </Field>
          <Field label="Tempat Lahir" required><input value={form.tempat_lahir} onChange={set('tempat_lahir')} className="field-input w-full text-sm" /></Field>
          <Field label="Tanggal Lahir" required><DateInput value={form.tanggal_lahir} onChange={set('tanggal_lahir')} className="field-input w-full text-sm" /></Field>
          <Field label="Alamat" span required><input value={form.alamat} onChange={set('alamat')} className="field-input w-full text-sm" /></Field>
          <Field label="No. HP" required><input value={form.no_telp} onChange={set('no_telp')} className="field-input w-full text-sm" /></Field>
          <Field label="Status Pernikahan" required>
            <select value={form.status_pernikahan} onChange={set('status_pernikahan')} className="field-input w-full text-sm text-ink-700">
              <option value="">—</option>
              <option value="belum_menikah">Belum Menikah</option>
              <option value="menikah">Menikah</option>
            </select>
          </Field>
          <Field label="Tinggi Badan (cm)" required><input type="number" min="50" max="250" value={form.tinggi_badan} onChange={set('tinggi_badan')} className="field-input w-full text-sm" /></Field>
          <Field label="Berat Badan (kg)" required><input type="number" min="20" max="300" value={form.berat_badan} onChange={set('berat_badan')} className="field-input w-full text-sm" /></Field>
        </div>
      </div>

      <div className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm text-ink-900 mb-3">Untuk Pencari Kerja</h3>
        <div className="space-y-3">
          <Field label="Keahlian" required>
            <div className="flex gap-2 mb-2">
              <input
                value={keahlianBaru}
                onChange={(e) => setKeahlianBaru(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tambahKeahlian(); } }}
                placeholder="mis. Microsoft Office"
                className="field-input w-full text-sm"
              />
              <button type="button" onClick={tambahKeahlian} className="shrink-0 flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>
            {form.keahlian.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.keahlian.map((k) => (
                  <span key={k} className="badge-soft badge-brand flex items-center gap-1">
                    {k}
                    <button type="button" onClick={() => hapusKeahlian(k)} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="Pengalaman Kerja (opsional)">
            <textarea value={form.pengalaman_kerja} onChange={set('pengalaman_kerja')} rows={2} placeholder="Kosongkan kalau belum pernah bekerja" className="field-input w-full text-sm" />
          </Field>
        </div>
      </div>

      <button disabled={saving} className="btn-primary w-full justify-center">
        <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Biodata'}
      </button>

      <div className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm text-ink-900 mb-1">KTP <span className="text-rose-600">*</span></h3>
        <p className="text-xs text-ink-500 mb-3">Foto/scan KTP, PDF atau gambar, maksimal 2MB.</p>
        {profile?.ktp_url ? (
          <div className="flex items-center justify-between gap-2 border border-line-200 rounded-lg px-3 py-2">
            <a href={profile.ktp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 min-w-0">
              <IdCard className="w-4 h-4 shrink-0" /> <span className="truncate">Lihat KTP</span>
            </a>
            <button type="button" onClick={handleHapusKtp} disabled={hapusKtpLoading} className="text-ink-400 hover:text-honey-700 hover:bg-honey-50 rounded-lg p-1.5 -m-1.5 shrink-0 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer border border-dashed border-line-300 rounded-lg px-3 py-2.5 hover:border-brand-400 transition">
            <IdCard className="w-4 h-4 text-ink-400" />
            {uploadingKtp ? 'Mengunggah...' : (ktpFile?.name || 'Unggah KTP (PDF/gambar)')}
            <input type="file" accept="application/pdf,image/*" className="hidden" disabled={uploadingKtp} onChange={(e) => handleUploadKtp(e.target.files[0] || null)} />
          </label>
        )}
      </div>

      <div className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm text-ink-900 mb-1">CV <span className="text-rose-600">*</span></h3>
        <p className="text-xs text-ink-500 mb-3">File PDF, maksimal 2MB.</p>
        {profile?.cv_url ? (
          <div className="flex items-center justify-between gap-2 border border-line-200 rounded-lg px-3 py-2">
            <a href={profile.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 min-w-0">
              <FileText className="w-4 h-4 shrink-0" /> <span className="truncate">Lihat CV</span>
            </a>
            <button type="button" onClick={handleHapusCv} disabled={hapusCvLoading} className="text-ink-400 hover:text-honey-700 hover:bg-honey-50 rounded-lg p-1.5 -m-1.5 shrink-0 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer border border-dashed border-line-300 rounded-lg px-3 py-2.5 hover:border-brand-400 transition">
            <FileText className="w-4 h-4 text-ink-400" />
            {uploadingCv ? 'Mengunggah...' : (cvFile?.name || 'Unggah CV (PDF)')}
            <input type="file" accept="application/pdf" className="hidden" disabled={uploadingCv} onChange={(e) => handleUploadCv(e.target.files[0] || null)} />
          </label>
        )}
      </div>

      <div className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm text-ink-900 mb-1">Sertifikat (opsional)</h3>
        <p className="text-xs text-ink-500 mb-3">Bisa unggah lebih dari satu — PDF/gambar, maksimal 2MB per file.</p>

        {profile?.sertifikat_list?.length > 0 && (
          <div className="space-y-2 mb-3">
            {profile.sertifikat_list.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 border border-line-200 rounded-lg px-3 py-2">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 min-w-0">
                  <Award className="w-4 h-4 shrink-0" /> <span className="truncate">{s.nama}</span>
                </a>
                <button type="button" onClick={() => handleHapusSertifikat(s.id)} disabled={hapusSertifikatId === s.id} className="text-ink-400 hover:text-honey-700 hover:bg-honey-50 rounded-lg p-1.5 -m-1.5 shrink-0 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <input
            value={namaSertifikatBaru}
            onChange={(e) => setNamaSertifikatBaru(e.target.value)}
            placeholder="Nama sertifikat, mis. Sertifikat Jaringan Dasar"
            className="field-input w-full text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer border border-dashed border-line-300 rounded-lg px-3 py-2.5 hover:border-brand-400 transition">
            <Award className="w-4 h-4 text-ink-400" />
            {fileSertifikatBaru?.name || 'Pilih file sertifikat'}
            <input ref={sertifikatInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFileSertifikatBaru(e.target.files[0] || null)} />
          </label>
          <button
            type="button"
            onClick={handleUploadSertifikat}
            disabled={uploadingSertifikat || !fileSertifikatBaru || !namaSertifikatBaru.trim()}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5" /> {uploadingSertifikat ? 'Mengunggah...' : 'Tambah Sertifikat'}
          </button>
        </div>
      </div>
    </form>
  );
}
