import { useEffect, useState } from 'react';
import { Upload, Check, Download, ImagePlus, CheckCircle2, ChevronLeft } from 'lucide-react';
import api from '../../../api/axios';
import DateInput from '../../../components/DateInput';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Verifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };

const FORM_KOSONG = {
  // A. Keterangan Pribadi
  nama_lengkap: '', nik: '', jenis_kelamin: 'L', nisn: '', tempat_lahir: '', tanggal_lahir: '',
  no_registrasi_akta_lahir: '', agama: '', kewarganegaraan: 'Indonesia', berkebutuhan_khusus: '',
  tempat_tinggal: '', alamat: '', anak_ke: '', jumlah_saudara: '', no_hp_siswa: '',
  // B. Pendidikan
  asal_sekolah: '', ijazah_terakhir: '', tanggal_no_stk: '',
  // C. Data Ayah Kandung
  nama_ayah: '', pekerjaan_ayah: '', penghasilan_ayah: '', alamat_ayah: '', no_hp_ayah: '',
  // D. Data Ibu Kandung
  nama_ibu: '', pekerjaan_ibu: '', penghasilan_ibu: '', alamat_ibu: '', no_hp_ibu: '',
  // E. Data Wali
  nama_wali: '', alamat_wali: '',
  // F. Data Periodik Siswa
  jurusan_pilihan: '', tinggi_badan: '', jarak_rumah_sekolah: '', berat_badan: '', ukuran_baju: '', hobi: '',
  // Admin-only
  status: 'mendaftar', catatan: '',
};

// Sama persis dengan BERKAS_LIST di halaman publik PpdbPublic.jsx —
// pas_foto & pernyataan ditaruh khusus (lihat JSX), sisanya di grid ini.
const BERKAS_LIST = [
  { key: 'berkas_ijazah', label: 'Scan Asli Ijazah SMP (dilegalisir)' },
  { key: 'berkas_skhu', label: 'Scan Asli SKHU (dilegalisir)' },
  { key: 'berkas_rapot', label: 'Scan Asli Nilai Rapor Kelas IX' },
  { key: 'berkas_skkb', label: 'Surat Keterangan Berkelakuan Baik' },
  { key: 'berkas_akta_lahir', label: 'Scan Asli Akta Kelahiran' },
  { key: 'berkas_kk', label: 'Scan Asli Kartu Keluarga' },
  { key: 'berkas_kip', label: 'Scan Asli Kartu Indonesia Pintar (bila ada)' },
];

function Section({ title, children }) {
  return (
    <div className="border border-line-200 rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, span, req, children }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-ink-500 mb-1">
        {label}
        {req && <span className="text-rose-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Input pendaftar PPDB offline langsung dari admin — field-nya SENGAJA
 * dibuat sama persis dengan formulir publik PpdbPublic.jsx (section A-G +
 * pas foto/jurusan di atas) supaya data yang masuk lewat 2 jalur ini
 * konsisten, tidak ada yang lebih "lengkap" dari yang lain. Beda dengan
 * versi publik: ada field Status & Catatan (admin bisa langsung set),
 * pas foto TIDAK wajib (boleh disusulkan), dan tidak ada honeypot/popup.
 *
 * `editTarget` (opsional) — kalau diisi (objek PpdbPendaftar), komponen ini
 * dipakai untuk MENGEDIT data pendaftar yang sudah ada (bukan bikin baru):
 * form di-prefill dari datanya, submit lewat PUT /ppdb/{id}/manual (bukan
 * POST /ppdb/manual), dan berkas yang sudah ada ditampilkan sebagai link
 * "Lihat file saat ini" di sebelah tombol upload (upload baru = ganti).
 */
export default function TambahPendaftarPpdbTab({ onSaved, onBack, editTarget }) {
  const [jurusanList, setJurusanList] = useState([]);
  const [templateUrl, setTemplateUrl] = useState(null);
  const [form, setForm] = useState(() => (
    editTarget
      ? Object.fromEntries(Object.keys(FORM_KOSONG).map((k) => [k, editTarget[k] ?? FORM_KOSONG[k]]))
      : FORM_KOSONG
  ));
  const [berkas, setBerkas] = useState({});
  const [fotoPreview, setFotoPreview] = useState(editTarget?.berkas_pas_foto_url || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sukses, setSukses] = useState(null);

  useEffect(() => {
    api.get('/ppdb/jurusan').then((res) => setJurusanList(res.data)).catch(() => {});
    api.get('/ppdb/pengaturan').then((res) => setTemplateUrl(res.data.template_pernyataan_url)).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pilihFotoPreview = (file) => {
    setBerkas({ ...berkas, berkas_pas_foto: file || null });
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const resetForm = () => {
    setForm(FORM_KOSONG);
    setBerkas({});
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      Object.entries(berkas).forEach(([k, file]) => { if (file) fd.append(k, file); });
      if (editTarget) {
        fd.append('_method', 'PUT');
        const res = await api.post(`/ppdb/${editTarget.id}/manual`, fd);
        setSukses(res.data);
      } else {
        const res = await api.post('/ppdb/manual', fd);
        setSukses(res.data);
        resetForm();
      }
      onSaved?.();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan pendaftar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-700">
          {editTarget ? (
            <>Mengedit data pendaftar <strong>{editTarget.nama_lengkap}</strong> ({editTarget.kode_pendaftaran}) — ubah field yang perlu dibetulkan, lalu simpan. Unggah berkas baru untuk mengganti yang lama.</>
          ) : (
            <>Input pendaftar yang datang langsung ke sekolah (offline) — field-nya sama dengan formulir online publik, tapi cuma <strong>Nama Lengkap</strong>, <strong>Jenis Kelamin</strong>, &amp; <strong>Jurusan Diminati</strong> yang wajib diisi di sini, sisanya boleh menyusul. Hasilnya langsung masuk ke daftar pendaftar PPDB yang sama.</>
          )}
        </p>
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5 shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
          </button>
        )}
      </div>

      {sukses && (
        <div className="surface-card p-4 border-l-4 border-l-brand-500 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink-900">Pendaftar "{sukses.nama_lengkap}" berhasil {editTarget ? 'diperbarui' : 'disimpan'}.</p>
            <p className="text-xs text-ink-500 mt-0.5 font-mono">Kode Pendaftaran: {sukses.kode_pendaftaran}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}

        <label className="flex items-center gap-2.5 border border-line-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-mist-50 transition">
          <input type="file" accept=".pdf" className="hidden" onChange={(e) => setBerkas({ ...berkas, berkas_formulir_pendaftaran: e.target.files[0] || null })} />
          {berkas.berkas_formulir_pendaftaran || editTarget?.berkas_formulir_pendaftaran_url ? <Check className="w-4 h-4 text-brand-600 shrink-0" /> : <Upload className="w-4 h-4 text-ink-300 shrink-0" />}
          <span className="text-xs text-ink-700 truncate">{berkas.berkas_formulir_pendaftaran?.name || 'Upload PDF Formulir Pendaftaran'}</span>
          {!berkas.berkas_formulir_pendaftaran && editTarget?.berkas_formulir_pendaftaran_url && (
            <a
              href={editTarget.berkas_formulir_pendaftaran_url} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-medium text-brand-600 hover:underline shrink-0 ml-auto"
            >
              Lihat Berkas
            </a>
          )}
        </label>

        <div className="border border-line-200 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Pas Foto</label>
              <label className="flex flex-col items-center justify-center gap-1.5 w-28 h-32 border-2 border-dashed border-line-300 rounded-lg cursor-pointer hover:bg-mist-50 transition overflow-hidden">
                <input type="file" accept=".jpg,.jpeg" className="hidden" onChange={(e) => pilihFotoPreview(e.target.files[0] || null)} />
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Pratinjau pas foto" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-ink-300" />
                    <span className="text-[10px] text-ink-400 text-center px-1">Unggah Foto (JPG)</span>
                  </>
                )}
              </label>
              {!berkas.berkas_pas_foto && editTarget?.berkas_pas_foto_url && (
                <a
                  href={editTarget.berkas_pas_foto_url} target="_blank" rel="noreferrer"
                  className="block text-center text-[10px] font-medium text-brand-600 hover:underline mt-1"
                >
                  Lihat Berkas
                </a>
              )}
            </div>
            <Field label="Jurusan Diminati" req>
              <select value={form.jurusan_pilihan} onChange={set('jurusan_pilihan')} className="field-input w-full text-ink-700" required>
                <option value="">— Pilih Jurusan —</option>
                {jurusanList.map((j) => <option key={j.id} value={j.nama}>{j.nama}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <Section title="A. Keterangan Pribadi">
          <Field label="Nama Lengkap" span req><input value={form.nama_lengkap} onChange={set('nama_lengkap')} className="field-input w-full" required /></Field>
          <Field label="NIK"><input value={form.nik} onChange={set('nik')} className="field-input w-full" /></Field>
          <Field label="Jenis Kelamin" req>
            <select value={form.jenis_kelamin} onChange={set('jenis_kelamin')} className="field-input w-full text-ink-700" required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label="NISN"><input value={form.nisn} onChange={set('nisn')} className="field-input w-full" /></Field>
          <Field label="No. Registrasi Akta Lahir"><input value={form.no_registrasi_akta_lahir} onChange={set('no_registrasi_akta_lahir')} className="field-input w-full" /></Field>
          <Field label="Tempat Lahir"><input value={form.tempat_lahir} onChange={set('tempat_lahir')} className="field-input w-full" /></Field>
          <Field label="Tanggal Lahir"><DateInput value={form.tanggal_lahir} onChange={set('tanggal_lahir')} className="field-input w-full" /></Field>
          <Field label="Agama"><input value={form.agama} onChange={set('agama')} className="field-input w-full" /></Field>
          <Field label="Kewarganegaraan"><input value={form.kewarganegaraan} onChange={set('kewarganegaraan')} className="field-input w-full" /></Field>
          <Field label="Berkebutuhan Khusus" span><input value={form.berkebutuhan_khusus} onChange={set('berkebutuhan_khusus')} placeholder="Kosongkan kalau tidak ada" className="field-input w-full" /></Field>
          <Field label="Tempat Tinggal"><input value={form.tempat_tinggal} onChange={set('tempat_tinggal')} placeholder="Mis. Bersama orang tua" className="field-input w-full" /></Field>
          <Field label="No. HP Peserta Didik"><input value={form.no_hp_siswa} onChange={set('no_hp_siswa')} className="field-input w-full" /></Field>
          <Field label="Alamat" span><textarea value={form.alamat} onChange={set('alamat')} className="field-input w-full" rows={2} /></Field>
          <Field label="Anak Ke"><input type="number" min="1" value={form.anak_ke} onChange={set('anak_ke')} className="field-input w-full" /></Field>
          <Field label="Jumlah Sdr Kandung/Tiri"><input type="number" min="0" value={form.jumlah_saudara} onChange={set('jumlah_saudara')} className="field-input w-full" /></Field>
        </Section>

        <Section title="B. Pendidikan">
          <Field label="Sekolah Asal" span><input value={form.asal_sekolah} onChange={set('asal_sekolah')} className="field-input w-full" /></Field>
          <Field label="Ijazah Terakhir"><input value={form.ijazah_terakhir} onChange={set('ijazah_terakhir')} className="field-input w-full" /></Field>
          <Field label="Tanggal / No. STK"><input value={form.tanggal_no_stk} onChange={set('tanggal_no_stk')} className="field-input w-full" /></Field>
        </Section>

        <Section title="C. Data Ayah Kandung">
          <Field label="Nama"><input value={form.nama_ayah} onChange={set('nama_ayah')} className="field-input w-full" /></Field>
          <Field label="Pekerjaan"><input value={form.pekerjaan_ayah} onChange={set('pekerjaan_ayah')} className="field-input w-full" /></Field>
          <Field label="Penghasilan Perbulan"><input value={form.penghasilan_ayah} onChange={set('penghasilan_ayah')} className="field-input w-full" /></Field>
          <Field label="No. HP/Telpon"><input value={form.no_hp_ayah} onChange={set('no_hp_ayah')} className="field-input w-full" /></Field>
          <Field label="Alamat" span><input value={form.alamat_ayah} onChange={set('alamat_ayah')} className="field-input w-full" /></Field>
        </Section>

        <Section title="D. Data Ibu Kandung">
          <Field label="Nama"><input value={form.nama_ibu} onChange={set('nama_ibu')} className="field-input w-full" /></Field>
          <Field label="Pekerjaan"><input value={form.pekerjaan_ibu} onChange={set('pekerjaan_ibu')} className="field-input w-full" /></Field>
          <Field label="Penghasilan Perbulan"><input value={form.penghasilan_ibu} onChange={set('penghasilan_ibu')} className="field-input w-full" /></Field>
          <Field label="No. HP/Telpon"><input value={form.no_hp_ibu} onChange={set('no_hp_ibu')} className="field-input w-full" /></Field>
          <Field label="Alamat" span><input value={form.alamat_ibu} onChange={set('alamat_ibu')} className="field-input w-full" /></Field>
        </Section>

        <Section title="E. Data Wali">
          <Field label="Nama"><input value={form.nama_wali} onChange={set('nama_wali')} placeholder="Kosongkan kalau tidak ada wali" className="field-input w-full" /></Field>
          <Field label="Alamat / No. HP"><input value={form.alamat_wali} onChange={set('alamat_wali')} className="field-input w-full" /></Field>
        </Section>

        <Section title="F. Data Periodik Siswa">
          <Field label="Tinggi Badan (cm)"><input type="number" value={form.tinggi_badan} onChange={set('tinggi_badan')} className="field-input w-full" /></Field>
          <Field label="Berat Badan (kg)"><input type="number" value={form.berat_badan} onChange={set('berat_badan')} className="field-input w-full" /></Field>
          <Field label="Jarak Tempat Tinggal ke Sekolah"><input value={form.jarak_rumah_sekolah} onChange={set('jarak_rumah_sekolah')} placeholder="Mis. 5 km" className="field-input w-full" /></Field>
          <Field label="Ukuran Baju"><input value={form.ukuran_baju} onChange={set('ukuran_baju')} placeholder="Mis. M, L, XL" className="field-input w-full" /></Field>
          <Field label="Hobby" span><input value={form.hobi} onChange={set('hobi')} className="field-input w-full" /></Field>
        </Section>

        <div className="border border-line-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-1">G. Berkas Persyaratan</p>
          <p className="text-xs text-ink-500 mb-3">Format PDF, maksimal 2MB per berkas. Semua opsional — bisa disusulkan langsung ke sekolah kalau belum sempat diunggah.</p>

          <div className={`grid grid-cols-1 ${templateUrl ? 'sm:grid-cols-2' : ''} gap-2.5 mb-2.5`}>
            {templateUrl && (
              <a
                href={templateUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2.5"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template Fakta Integritas
              </a>
            )}
            <label className="flex items-center gap-2.5 border border-line-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-mist-50 transition">
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setBerkas({ ...berkas, berkas_pernyataan: e.target.files[0] || null })} />
              {berkas.berkas_pernyataan || editTarget?.berkas_pernyataan_url ? <Check className="w-4 h-4 text-brand-600 shrink-0" /> : <Upload className="w-4 h-4 text-ink-300 shrink-0" />}
              <span className="text-xs text-ink-700 truncate">{berkas.berkas_pernyataan?.name || 'Scan Asli Fakta Integritas'}</span>
              {!berkas.berkas_pernyataan && editTarget?.berkas_pernyataan_url && (
                <a
                  href={editTarget.berkas_pernyataan_url} target="_blank" rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-medium text-brand-600 hover:underline shrink-0 ml-auto"
                >
                  Lihat Berkas
                </a>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BERKAS_LIST.map((b) => (
              <label key={b.key} className="flex items-center gap-2.5 border border-line-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-mist-50 transition">
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => setBerkas({ ...berkas, [b.key]: e.target.files[0] || null })} />
                {berkas[b.key] || editTarget?.[`${b.key}_url`] ? <Check className="w-4 h-4 text-brand-600 shrink-0" /> : <Upload className="w-4 h-4 text-ink-300 shrink-0" />}
                <span className="text-xs text-ink-700 truncate">{berkas[b.key]?.name || b.label}</span>
                {!berkas[b.key] && editTarget?.[`${b.key}_url`] && (
                  <a
                    href={editTarget[`${b.key}_url`]} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-medium text-brand-600 hover:underline shrink-0 ml-auto"
                  >
                    Lihat Berkas
                  </a>
                )}
              </label>
            ))}
          </div>
        </div>

        <Section title="Status Pendaftaran (Admin)">
          <Field label="Status">
            <select value={form.status} onChange={set('status')} className="field-input w-full text-ink-700">
              {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Catatan (opsional)"><input value={form.catatan} onChange={set('catatan')} className="field-input w-full" /></Field>
        </Section>

        <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Simpan Pendaftar'}</button>
      </form>
    </div>
  );
}
