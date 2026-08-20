import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, ImagePlus, UserRound, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import DateInput from '../components/DateInput';

const FORM_KOSONG = {
  name: '', email: '', nis: '', nisn: '', nik: '', jenis_kelamin: '', agama: '',
  class_room_id: '', jurusan_id: '', tempat_lahir: '', tanggal_lahir: '', alamat: '',
  kebutuhan_khusus: '', jumlah_saudara: '', anak_ke: '', no_telp: '',
  sekolah_asal_nama: '', sekolah_asal_alamat: '', ijazah_tahun: '', ijazah_nomor: '',
  tingkat_diterima: '', tanggal_diterima: '',
  nama_ayah: '', nama_ibu: '', alamat_ortu: '', telp_ortu: '', pekerjaan_ortu: '', penghasilan_ortu: '',
  nama_wali: '', alamat_wali: '', telp_wali: '', pekerjaan_wali: '',
};

function Section({ nomor, title, children }) {
  return (
    <div className="surface-card p-5">
      <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">{nomor}</span>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

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

// Halaman penuh (bukan popup) untuk mengisi/mengubah biodata lengkap 1
// siswa — mengikuti urutan & isian form kertas "Keterangan Tentang Diri
// Siswa" di Buku Induk sekolah (nama, NIS/NISN/NIK, sekolah asal,
// ijazah/STTB, penerimaan, orang tua, wali), supaya TU/Admin/Waka
// Kesiswaan bisa memindahkan data dari kertas ke sistem persis strukturnya.
// Dibuka lewat window.open dari tombol "Edit" (pola sama seperti Detail
// Buku Induk & Cetak Kartu Pelajar), BUKAN modal — field-nya terlalu
// banyak untuk muat rapi di popup.
export default function EditBiodataSiswaPage() {
  const { id } = useParams();

  const [classes, setClasses] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(FORM_KOSONG);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/students/${id}`),
      api.get('/classes'),
      api.get('/jurusan'),
    ]).then(([resStudent, resClasses, resJurusan]) => {
      const s = resStudent.data;
      setStudent(s);
      setClasses(resClasses.data);
      setJurusanList(resJurusan.data);
      setForm({
        name: s.user?.name || '', email: s.user?.email || '',
        nis: s.nis || '', nisn: s.nisn || '', nik: s.nik || '',
        jenis_kelamin: s.jenis_kelamin || '', agama: s.agama || '',
        class_room_id: s.class_room_id || '', jurusan_id: s.jurusan_id || '',
        tempat_lahir: s.tempat_lahir || '', tanggal_lahir: s.tanggal_lahir || '', alamat: s.alamat || '',
        kebutuhan_khusus: s.kebutuhan_khusus || '', jumlah_saudara: s.jumlah_saudara ?? '', anak_ke: s.anak_ke ?? '',
        no_telp: s.no_telp || '',
        sekolah_asal_nama: s.sekolah_asal_nama || '', sekolah_asal_alamat: s.sekolah_asal_alamat || '',
        ijazah_tahun: s.ijazah_tahun || '', ijazah_nomor: s.ijazah_nomor || '',
        tingkat_diterima: s.tingkat_diterima || '', tanggal_diterima: s.tanggal_diterima || '',
        nama_ayah: s.nama_ayah || '', nama_ibu: s.nama_ibu || '',
        alamat_ortu: s.alamat_ortu || '', telp_ortu: s.telp_ortu || '',
        pekerjaan_ortu: s.pekerjaan_ortu || '', penghasilan_ortu: s.penghasilan_ortu || '',
        nama_wali: s.nama_wali || '', alamat_wali: s.alamat_wali || '',
        telp_wali: s.telp_wali || '', pekerjaan_wali: s.pekerjaan_wali || '',
      });
    }).catch((err) => setError(err.response?.data?.message || 'Gagal memuat data siswa.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pilihFoto = (file) => {
    setFotoFile(file);
    setFotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await api.put(`/students/${id}`, form);
      let updated = res.data;
      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        const resFoto = await api.post(`/students/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        updated = resFoto.data;
      }
      setStudent(updated);
      setFotoFile(null);
      setFotoPreview(null);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;
  if (error && !student) return <div className="p-8 text-center text-rose-600">{error}</div>;

  const fotoTampil = fotoPreview || student.foto_url;

  return (
    <div className="min-h-screen bg-mist-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => window.close()} className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft className="w-4 h-4" /> Tutup
          </button>
          <button disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

        <div className="surface-card p-5 flex items-center gap-4">
          {fotoTampil ? (
            <img src={fotoTampil} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-mist-50 flex items-center justify-center shrink-0">
              <UserRound className="w-7 h-7 text-ink-300" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-semibold text-ink-900 text-lg truncate">Biodata Siswa — {student.user?.name}</h2>
            <p className="text-sm text-ink-500">NIS {student.nis} · {student.class_room?.name || 'Belum ada kelas'}</p>
            <label className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700 cursor-pointer w-fit">
              <ImagePlus className="w-3.5 h-3.5" /> Ganti Foto
              <input type="file" accept="image/*" onChange={(e) => pilihFoto(e.target.files[0] || null)} className="hidden" />
            </label>
          </div>
        </div>

        <p className="text-xs text-ink-500"><span className="text-rose-600">*</span> Wajib diisi</p>

        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        {saved && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">Perubahan tersimpan.</p>}

        <Section nomor="1-10" title="Keterangan Diri Siswa">
          <Field label="Nama Siswa" span required><input value={form.name} onChange={set('name')} className="field-input w-full" required /></Field>
          <Field label="Nomor Induk (NIS)" required><input value={form.nis} onChange={set('nis')} className="field-input w-full" required /></Field>
          <Field label="NISN"><input value={form.nisn} onChange={set('nisn')} className="field-input w-full" /></Field>
          <Field label="NIK"><input value={form.nik} onChange={set('nik')} className="field-input w-full" /></Field>
          <Field label="Email Akun" required><input value={form.email} onChange={set('email')} type="email" autoComplete="off" className="field-input w-full" required /></Field>
          <Field label="Jenis Kelamin" required>
            <select value={form.jenis_kelamin} onChange={set('jenis_kelamin')} className="field-input text-ink-700 w-full" required>
              <option value="">—</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label="Agama" required>
            <select value={form.agama} onChange={set('agama')} className="field-input text-ink-700 w-full" required>
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
          <Field label="Tempat Lahir" required><input value={form.tempat_lahir} onChange={set('tempat_lahir')} className="field-input w-full" required /></Field>
          <Field label="Tanggal Lahir" required><DateInput value={form.tanggal_lahir} onChange={set('tanggal_lahir')} className="field-input w-full" required /></Field>
          <Field label="Alamat Siswa" span required><input value={form.alamat} onChange={set('alamat')} className="field-input w-full" required /></Field>
          <Field label="Kebutuhan Khusus"><input value={form.kebutuhan_khusus} onChange={set('kebutuhan_khusus')} className="field-input w-full" placeholder="kosongkan kalau tidak ada" /></Field>
          <Field label="No. Telp Siswa"><input value={form.no_telp} onChange={set('no_telp')} className="field-input w-full" /></Field>
          <Field label="Jumlah Saudara"><input type="number" min="0" value={form.jumlah_saudara} onChange={set('jumlah_saudara')} className="field-input w-full" /></Field>
          <Field label="Anak Ke-"><input type="number" min="0" value={form.anak_ke} onChange={set('anak_ke')} className="field-input w-full" /></Field>
        </Section>

        <Section nomor="11" title="Sekolah Asal">
          <Field label="Nama Sekolah"><input value={form.sekolah_asal_nama} onChange={set('sekolah_asal_nama')} className="field-input w-full" /></Field>
          <Field label="Alamat Sekolah"><input value={form.sekolah_asal_alamat} onChange={set('sekolah_asal_alamat')} className="field-input w-full" /></Field>
        </Section>

        <Section nomor="12" title="Surat Tanda Tamat Belajar / Ijazah / STL">
          <Field label="Tahun"><input value={form.ijazah_tahun} onChange={set('ijazah_tahun')} className="field-input w-full" placeholder="mis. 2023/2024" /></Field>
          <Field label="Nomor"><input value={form.ijazah_nomor} onChange={set('ijazah_nomor')} className="field-input w-full" /></Field>
        </Section>

        <Section nomor="13" title="Diterima di Sekolah Ini">
          <Field label="Tingkat / Kelas Saat Diterima"><input value={form.tingkat_diterima} onChange={set('tingkat_diterima')} className="field-input w-full" placeholder="mis. X" /></Field>
          <Field label="Pada Tanggal"><DateInput value={form.tanggal_diterima} onChange={set('tanggal_diterima')} className="field-input w-full" /></Field>
          <Field label="Kelas Saat Ini" required>
            <select value={form.class_room_id} onChange={set('class_room_id')} className="field-input text-ink-700 w-full" required>
              <option value="">— Belum Ada Kelas —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Kompetensi Keahlian (Jurusan)" required>
            <select value={form.jurusan_id} onChange={set('jurusan_id')} className="field-input text-ink-700 w-full" required>
              <option value="">— Belum Ada Jurusan —</option>
              {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
          </Field>
        </Section>

        <Section nomor="14-17" title="Orang Tua">
          <Field label="Nama Ayah"><input value={form.nama_ayah} onChange={set('nama_ayah')} className="field-input w-full" /></Field>
          <Field label="Nama Ibu"><input value={form.nama_ibu} onChange={set('nama_ibu')} className="field-input w-full" /></Field>
          <Field label="Alamat Orang Tua" span><input value={form.alamat_ortu} onChange={set('alamat_ortu')} className="field-input w-full" /></Field>
          <Field label="No. Telp Orang Tua"><input value={form.telp_ortu} onChange={set('telp_ortu')} className="field-input w-full" /></Field>
          <Field label="Pekerjaan Orang Tua"><input value={form.pekerjaan_ortu} onChange={set('pekerjaan_ortu')} className="field-input w-full" /></Field>
          <Field label="Penghasilan Orang Tua" span><input value={form.penghasilan_ortu} onChange={set('penghasilan_ortu')} className="field-input w-full" placeholder="mis. 2.000.000" /></Field>
        </Section>

        <Section nomor="18-20" title="Wali (kalau ada)">
          <Field label="Nama Wali"><input value={form.nama_wali} onChange={set('nama_wali')} className="field-input w-full" /></Field>
          <Field label="No. Telp Wali"><input value={form.telp_wali} onChange={set('telp_wali')} className="field-input w-full" /></Field>
          <Field label="Alamat Wali" span><input value={form.alamat_wali} onChange={set('alamat_wali')} className="field-input w-full" /></Field>
          <Field label="Pekerjaan Wali" span><input value={form.pekerjaan_wali} onChange={set('pekerjaan_wali')} className="field-input w-full" /></Field>
        </Section>

        <div className="flex justify-end">
          <button disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
