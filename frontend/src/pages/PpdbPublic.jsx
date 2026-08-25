import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserPlus, Search, CheckCircle2, Upload, Check, Download, ClipboardList, X, ImagePlus, Pencil } from 'lucide-react';
import api from '../api/axios';
import { useSchoolProfile } from '../context/SchoolProfileContext';
import DateInput from '../components/DateInput';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Sedang Diverifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_BADGE = { mendaftar: 'badge-soft', verifikasi: 'badge-honey', diterima: 'badge-brand', ditolak: 'badge-soft' };

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
  website: '', // honeypot — disembunyikan dari manusia lewat CSS, bot pengisi-otomatis biasanya ikut isi semua field yang ada
};

// berkas_pas_foto & berkas_pernyataan SENGAJA tidak di sini — pas foto
// ditaruh di atas form (bersampingan Jurusan Diminati), pernyataan
// ditaruh berpasangan dengan tombol download template (lihat JSX).
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

export default function PpdbPublic() {
  const { profile } = useSchoolProfile();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'status' ? 'status' : 'daftar'); // 'daftar' | 'status'
  const [dibuka, setDibuka] = useState(true);
  const [templateUrl, setTemplateUrl] = useState(null);
  const [syaratText, setSyaratText] = useState('');
  const [showSyaratPopup, setShowSyaratPopup] = useState(true);
  const [jurusanList, setJurusanList] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [berkas, setBerkas] = useState({});
  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kodeBerhasil, setKodeBerhasil] = useState('');

  const [kodeCek, setKodeCek] = useState('');
  const [hasilCek, setHasilCek] = useState(null);
  const [errorCek, setErrorCek] = useState('');
  const [loadingCek, setLoadingCek] = useState(false);

  const [kodeEdit, setKodeEdit] = useState('');
  const [editData, setEditData] = useState(null);
  const [errorEdit, setErrorEdit] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editSukses, setEditSukses] = useState(false);

  useEffect(() => {
    api.get('/ppdb/pengaturan').then((res) => {
      setDibuka(res.data.dibuka);
      setTemplateUrl(res.data.template_pernyataan_url);
      setSyaratText(res.data.syarat_pendaftaran || '');
    }).catch(() => {});
    api.get('/ppdb/jurusan').then((res) => setJurusanList(res.data)).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pilihFotoPreview = (file) => {
    setBerkas({ ...berkas, berkas_pas_foto: file || null });
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleDaftar = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      Object.entries(berkas).forEach(([k, file]) => { if (file) fd.append(k, file); });
      const res = await api.post('/ppdb/daftar', fd);
      setKodeBerhasil(res.data.kode_pendaftaran);
      setForm(FORM_KOSONG);
      setBerkas({});
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
      setFotoPreview(null);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengirim pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleCekStatus = async (e) => {
    e.preventDefault();
    setErrorCek(''); setHasilCek(null); setLoadingCek(true);
    try {
      const res = await api.get(`/ppdb/status/${encodeURIComponent(kodeCek.trim())}`);
      setHasilCek(res.data);
    } catch (err) {
      setErrorCek(err.response?.data?.message || 'Kode pendaftaran tidak ditemukan.');
    } finally {
      setLoadingCek(false);
    }
  };

  const bukaCekStatus = (kode) => {
    setMode('status');
    setKodeCek(kode);
    setKodeBerhasil('');
  };

  /**
   * "Edit Data / Berkas" — calon siswa masukkan kode pendaftaran sendiri
   * (tanpa akun/login) untuk menarik biodata & berkas yang sudah pernah
   * dikirim, lalu membetulkan/melengkapinya. Form yang dipakai SAMA
   * dengan formulir daftar (lihat formBody di bawah), cuma field-nya
   * diprefill dan submit-nya lewat updateByKode() bukan daftar().
   */
  const handleCariEdit = async (e) => {
    e.preventDefault();
    setErrorEdit(''); setLoadingEdit(true); setEditSukses(false);
    try {
      const res = await api.get(`/ppdb/edit/${encodeURIComponent(kodeEdit.trim())}`);
      const data = res.data;
      setEditData(data);
      setForm(Object.fromEntries(Object.keys(FORM_KOSONG).map((k) => [k, data[k] ?? FORM_KOSONG[k]])));
      setBerkas({});
      setFotoPreview(data.berkas_pas_foto_url || null);
    } catch (err) {
      setEditData(null);
      setErrorEdit(err.response?.data?.message || 'Kode pendaftaran tidak ditemukan.');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSimpanEdit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== 'website' && v !== '' && v !== null) fd.append(k, v); });
      Object.entries(berkas).forEach(([k, file]) => { if (file) fd.append(k, file); });
      const res = await api.post(`/ppdb/edit/${encodeURIComponent(editData.kode_pendaftaran)}`, fd);
      setEditData(res.data.pendaftar);
      setEditSukses(true);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  const bukaEdit = (kode) => {
    setMode('edit');
    setKodeEdit(kode || '');
    setEditData(null);
    setEditSukses(false);
    setErrorEdit('');
  };

  const showPopup = mode === 'daftar' && dibuka && !kodeBerhasil && showSyaratPopup && (syaratText.trim() || templateUrl);

  // Isi formulir A-G — dipakai BERSAMA oleh mode 'daftar' (data kosong,
  // wajib) & mode 'edit' (data terisi dari editData, boleh sebagian).
  const formBody = (
    <>
      <div className="border border-line-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Pas Foto <span className="text-rose-600">*</span></label>
            <label className="flex flex-col items-center justify-center gap-1.5 w-28 h-32 border-2 border-dashed border-line-300 rounded-lg cursor-pointer hover:bg-mist-50 transition overflow-hidden">
              <input
                type="file" accept=".jpg,.jpeg" className="hidden" required={mode !== 'edit'}
                onChange={(e) => pilihFotoPreview(e.target.files[0] || null)}
              />
              {fotoPreview ? (
                <img src={fotoPreview} alt="Pratinjau pas foto" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5 text-ink-300" />
                  <span className="text-[10px] text-ink-400 text-center px-1">Unggah Foto (JPG)</span>
                </>
              )}
            </label>
            {!berkas.berkas_pas_foto && editData?.berkas_pas_foto_url && (
              <a
                href={editData.berkas_pas_foto_url} target="_blank" rel="noreferrer"
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
        <Field label="NIK" req={mode !== 'edit'}><input value={form.nik} onChange={set('nik')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Jenis Kelamin" req>
          <select value={form.jenis_kelamin} onChange={set('jenis_kelamin')} className="field-input w-full text-ink-700" required>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </Field>
        <Field label="NISN" req={mode !== 'edit'}><input value={form.nisn} onChange={set('nisn')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="No. Registrasi Akta Lahir"><input value={form.no_registrasi_akta_lahir} onChange={set('no_registrasi_akta_lahir')} placeholder="Opsional" className="field-input w-full" /></Field>
        <Field label="Tempat Lahir" req={mode !== 'edit'}><input value={form.tempat_lahir} onChange={set('tempat_lahir')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Tanggal Lahir" req={mode !== 'edit'}><DateInput value={form.tanggal_lahir} onChange={set('tanggal_lahir')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Agama" req={mode !== 'edit'}><input value={form.agama} onChange={set('agama')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Kewarganegaraan" req={mode !== 'edit'}><input value={form.kewarganegaraan} onChange={set('kewarganegaraan')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Berkebutuhan Khusus" span><input value={form.berkebutuhan_khusus} onChange={set('berkebutuhan_khusus')} placeholder="Kosongkan kalau tidak ada" className="field-input w-full" /></Field>
        <Field label="Tempat Tinggal" req={mode !== 'edit'}><input value={form.tempat_tinggal} onChange={set('tempat_tinggal')} placeholder="Mis. Bersama orang tua" className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="No. HP Peserta Didik" req={mode !== 'edit'}><input value={form.no_hp_siswa} onChange={set('no_hp_siswa')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Alamat" span req={mode !== 'edit'}><textarea value={form.alamat} onChange={set('alamat')} className="field-input w-full" rows={2} required={mode !== 'edit'} /></Field>
        <Field label="Anak Ke" req={mode !== 'edit'}><input type="number" min="1" value={form.anak_ke} onChange={set('anak_ke')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Jumlah Sdr Kandung/Tiri" req={mode !== 'edit'}><input type="number" min="0" value={form.jumlah_saudara} onChange={set('jumlah_saudara')} className="field-input w-full" required={mode !== 'edit'} /></Field>
      </Section>

      <Section title="B. Pendidikan">
        <Field label="Sekolah Asal" span req={mode !== 'edit'}><input value={form.asal_sekolah} onChange={set('asal_sekolah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Ijazah Terakhir" req={mode !== 'edit'}><input value={form.ijazah_terakhir} onChange={set('ijazah_terakhir')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Tanggal / No. STK"><input value={form.tanggal_no_stk} onChange={set('tanggal_no_stk')} placeholder="Opsional" className="field-input w-full" /></Field>
      </Section>

      <Section title="C. Data Ayah Kandung">
        <Field label="Nama" req={mode !== 'edit'}><input value={form.nama_ayah} onChange={set('nama_ayah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Pekerjaan" req={mode !== 'edit'}><input value={form.pekerjaan_ayah} onChange={set('pekerjaan_ayah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Penghasilan Perbulan" req={mode !== 'edit'}><input value={form.penghasilan_ayah} onChange={set('penghasilan_ayah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="No. HP/Telpon" req={mode !== 'edit'}><input value={form.no_hp_ayah} onChange={set('no_hp_ayah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Alamat" span req={mode !== 'edit'}><input value={form.alamat_ayah} onChange={set('alamat_ayah')} className="field-input w-full" required={mode !== 'edit'} /></Field>
      </Section>

      <Section title="D. Data Ibu Kandung">
        <Field label="Nama" req={mode !== 'edit'}><input value={form.nama_ibu} onChange={set('nama_ibu')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Pekerjaan" req={mode !== 'edit'}><input value={form.pekerjaan_ibu} onChange={set('pekerjaan_ibu')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Penghasilan Perbulan" req={mode !== 'edit'}><input value={form.penghasilan_ibu} onChange={set('penghasilan_ibu')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="No. HP/Telpon" req={mode !== 'edit'}><input value={form.no_hp_ibu} onChange={set('no_hp_ibu')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Alamat" span req={mode !== 'edit'}><input value={form.alamat_ibu} onChange={set('alamat_ibu')} className="field-input w-full" required={mode !== 'edit'} /></Field>
      </Section>

      <Section title="E. Data Wali">
        <Field label="Nama"><input value={form.nama_wali} onChange={set('nama_wali')} placeholder="Kosongkan kalau tidak ada wali" className="field-input w-full" /></Field>
        <Field label="Alamat / No. HP"><input value={form.alamat_wali} onChange={set('alamat_wali')} className="field-input w-full" /></Field>
      </Section>

      <Section title="F. Data Periodik Siswa">
        <Field label="Tinggi Badan (cm)" req={mode !== 'edit'}><input type="number" value={form.tinggi_badan} onChange={set('tinggi_badan')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Berat Badan (kg)" req={mode !== 'edit'}><input type="number" value={form.berat_badan} onChange={set('berat_badan')} className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Jarak Tempat Tinggal ke Sekolah" req={mode !== 'edit'}><input value={form.jarak_rumah_sekolah} onChange={set('jarak_rumah_sekolah')} placeholder="Mis. 5 km" className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Ukuran Baju" req={mode !== 'edit'}><input value={form.ukuran_baju} onChange={set('ukuran_baju')} placeholder="Mis. M, L, XL" className="field-input w-full" required={mode !== 'edit'} /></Field>
        <Field label="Hobby" span req={mode !== 'edit'}><input value={form.hobi} onChange={set('hobi')} className="field-input w-full" required={mode !== 'edit'} /></Field>
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
            <input
              type="file" accept=".pdf" className="hidden"
              onChange={(e) => setBerkas({ ...berkas, berkas_pernyataan: e.target.files[0] || null })}
            />
            {berkas.berkas_pernyataan || editData?.berkas_pernyataan_url ? (
              <Check className="w-4 h-4 text-brand-600 shrink-0" />
            ) : (
              <Upload className="w-4 h-4 text-ink-300 shrink-0" />
            )}
            <span className="text-xs text-ink-700 truncate">{berkas.berkas_pernyataan?.name || 'Scan Asli Fakta Integritas'}</span>
            {!berkas.berkas_pernyataan && editData?.berkas_pernyataan_url && (
              <a
                href={editData.berkas_pernyataan_url} target="_blank" rel="noreferrer"
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
              <input
                type="file" accept=".pdf" className="hidden"
                onChange={(e) => setBerkas({ ...berkas, [b.key]: e.target.files[0] || null })}
              />
              {berkas[b.key] || editData?.[`${b.key}_url`] ? (
                <Check className="w-4 h-4 text-brand-600 shrink-0" />
              ) : (
                <Upload className="w-4 h-4 text-ink-300 shrink-0" />
              )}
              <span className="text-xs text-ink-700 truncate">{berkas[b.key]?.name || b.label}</span>
              {!berkas[b.key] && editData?.[`${b.key}_url`] && (
                <a
                  href={editData[`${b.key}_url`]} target="_blank" rel="noreferrer"
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
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1B3A] px-4 py-10 relative overflow-hidden">
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowSyaratPopup(false)}
              className="absolute right-4 top-4 text-ink-300 hover:text-ink-600"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="font-display text-lg font-bold text-[#0B1B3A] mb-2">Syarat Berkas Pendaftaran</h2>
            {syaratText.trim() && (
              <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line mb-4">{syaratText}</p>
            )}
            {templateUrl && (
              <a
                href={templateUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2.5 mb-4 w-fit"
              >
                <Download className="w-4 h-4" /> Unduh Template Fakta Integritas
              </a>
            )}
            <button onClick={() => setShowSyaratPopup(false)} className="btn-primary w-full justify-center">
              Mengerti, Lanjutkan Daftar
            </button>
          </div>
        </div>
      )}

      <div
        className="absolute top-10 left-6 w-40 h-40 opacity-30 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #F2B705 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />
      <div
        className="absolute bottom-10 right-6 w-40 h-40 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #3FB27F 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />

      <div className="w-full max-w-3xl relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#F2B705] via-[#15803D] to-[#0B1B3A]" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center mb-6">
              {profile.logo_url && <img src={profile.logo_url} alt="Logo Sekolah" className="w-16 h-16 object-contain mb-3" />}
              <h1 className="font-display text-lg font-bold text-[#0B1B3A] text-center">{profile.nama_sekolah.toUpperCase()}</h1>
              <p className="text-xs text-ink-500 mt-1">Formulir PPDB Online</p>
              {profile.tahun_ajaran && <p className="text-xs text-ink-400 mt-0.5">Tahun Pembelajaran {profile.tahun_ajaran}</p>}
              <span className="mt-3 h-1 w-10 rounded-full bg-[#F2B705]" />
            </div>

            <div className="flex gap-1 bg-mist-50 rounded-lg p-1 mb-5 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setMode('daftar')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'daftar' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <UserPlus className="w-4 h-4" /> Daftar
              </button>
              <button
                type="button"
                onClick={() => setMode('status')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'status' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <Search className="w-4 h-4" /> Cek Status
              </button>
              <button
                type="button"
                onClick={() => bukaEdit('')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'edit' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <Pencil className="w-4 h-4" /> Edit Berkas
              </button>
            </div>

            {mode === 'daftar' ? (
              kodeBerhasil ? (
                <div className="text-center space-y-4 max-w-sm mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-brand-600 mx-auto" />
                  <p className="text-sm text-ink-700">Pendaftaran berhasil! Simpan kode pendaftaran di bawah ini untuk mengecek status.</p>
                  <p className="font-mono text-lg font-bold tracking-wider bg-mist-50 border border-line-200 rounded-lg py-3">{kodeBerhasil}</p>
                  <button onClick={() => bukaCekStatus(kodeBerhasil)} className="btn-primary w-full justify-center">Cek Status Sekarang</button>
                </div>
              ) : !dibuka ? (
                <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-3 text-center max-w-sm mx-auto">
                  Pendaftaran online sedang ditutup. Silakan hubungi pihak sekolah untuk informasi lebih lanjut.
                </p>
              ) : (
                <form onSubmit={handleDaftar} className="space-y-4">
                  {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                  <input
                    type="text" name="website" value={form.website} onChange={set('website')}
                    className="absolute -left-[9999px] w-px h-px opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true"
                  />
                  {formBody}
                  <button disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Mengirim...' : 'Kirim Pendaftaran'}</button>
                </form>
              )
            ) : mode === 'edit' ? (
              editSukses ? (
                <div className="text-center space-y-4 max-w-sm mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-brand-600 mx-auto" />
                  <p className="text-sm text-ink-700">Data pendaftaran berhasil diperbarui.</p>
                  <p className="font-mono text-lg font-bold tracking-wider bg-mist-50 border border-line-200 rounded-lg py-3">{editData.kode_pendaftaran}</p>
                  <button onClick={() => bukaCekStatus(editData.kode_pendaftaran)} className="btn-primary w-full justify-center">Cek Status</button>
                </div>
              ) : !editData ? (
                <div className="space-y-3 max-w-sm mx-auto">
                  <p className="text-xs text-ink-500 text-center">Masukkan kode pendaftaran untuk membuka & melengkapi biodata serta berkas yang sudah dikirim.</p>
                  <form onSubmit={handleCariEdit} className="flex gap-2">
                    <input placeholder="Kode Pendaftaran (contoh: PPDB-26-ABCDEF)" value={kodeEdit} onChange={(e) => setKodeEdit(e.target.value)} className="field-input flex-1 font-mono" required />
                    <button disabled={loadingEdit} className="btn-primary whitespace-nowrap">{loadingEdit ? '...' : 'Buka'}</button>
                  </form>
                  {errorEdit && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{errorEdit}</p>}
                </div>
              ) : (
                <form onSubmit={handleSimpanEdit} className="space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-mist-50 border border-line-200 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-[11px] text-ink-500">Mengedit data pendaftar</p>
                      <p className="font-mono text-sm font-semibold text-ink-900">{editData.kode_pendaftaran}</p>
                    </div>
                    <button type="button" onClick={() => setEditData(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700">Ganti Kode</button>
                  </div>
                  {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                  {formBody}
                  <button disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </form>
              )
            ) : (
              <div className="space-y-3 max-w-sm mx-auto">
                <form onSubmit={handleCekStatus} className="flex gap-2">
                  <input placeholder="Kode Pendaftaran (contoh: PPDB-26-ABCDEF)" value={kodeCek} onChange={(e) => setKodeCek(e.target.value)} className="field-input flex-1 font-mono" required />
                  <button disabled={loadingCek} className="btn-primary whitespace-nowrap">{loadingCek ? '...' : 'Cek'}</button>
                </form>
                {errorCek && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{errorCek}</p>}
                {hasilCek && (
                  <div className="surface-card p-4 space-y-2">
                    <p className="text-sm text-ink-500">Nama Pendaftar</p>
                    <p className="text-ink-900 font-medium">{hasilCek.nama_lengkap}</p>
                    <p className="text-sm text-ink-500 mt-2">Status</p>
                    <span className={`badge-soft ${STATUS_BADGE[hasilCek.status]}`}>{STATUS_LABEL[hasilCek.status]}</span>
                    {hasilCek.catatan && (
                      <>
                        <p className="text-sm text-ink-500 mt-2">Catatan</p>
                        <p className="text-ink-700 text-sm">{hasilCek.catatan}</p>
                      </>
                    )}
                    <button onClick={() => bukaEdit(hasilCek.kode_pendaftaran)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2 w-full mt-1">
                      <Pencil className="w-3.5 h-3.5" /> Edit Data / Berkas
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-ink-400 mt-6">
              <Link to="/ppdb" className="text-ink-500 hover:text-brand-600 hover:underline">&larr; Info PPDB</Link>
              {' · '}
              Staf sekolah? <Link to="/login" className="text-brand-600 hover:underline">Masuk di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
