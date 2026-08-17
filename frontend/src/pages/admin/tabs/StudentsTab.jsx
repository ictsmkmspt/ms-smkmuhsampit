import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Download, Upload, KeyRound, Save, Printer, ImagePlus, UserRound } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import DateInput from '../../../components/DateInput';

import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const JK_LABEL = { L: 'Laki-laki', P: 'Perempuan' };

const FORM_KOSONG = {
  name: '', email: '', nis: '', jenis_kelamin: '', class_room_id: '',
  jurusan_id: '', tempat_lahir: '', tanggal_lahir: '', alamat: '',
};

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [fotoFile, setFotoFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [uploadingFotoMassal, setUploadingFotoMassal] = useState(false);
  const [fotoMassalResult, setFotoMassalResult] = useState(null);
  const fotoMassalRef = useRef(null);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editFotoFile, setEditFotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...students].sort((a, b) => {
    const kelasA = a.class_room?.name || 'ZZZZZ';
    const kelasB = b.class_room?.name || 'ZZZZZ';
    if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
    return (a.user?.name || '').localeCompare(b.user?.name || '');
  }), [students]);
  const { page, setPage, totalPages, paginated: sortedHalaman } = usePagination(sorted, 40);

  const loadStudents = () => api.get('/students').then((res) => setStudents(res.data));
  const loadClasses = () => api.get('/classes').then((res) => setClasses(res.data));
  const loadJurusan = () => api.get('/jurusan').then((res) => setJurusanList(res.data));

  useEffect(() => {
    loadStudents();
    loadClasses();
    loadJurusan();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/students', form);
      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        await api.post(`/students/${res.data.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setForm(FORM_KOSONG);
      setFotoFile(null);
      setShowForm(false);
      loadStudents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menambah siswa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus siswa "${name}"? Data absensi siswa ini juga akan terhapus.`)) return;
    await api.delete(`/students/${id}`);
    loadStudents();
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password siswa "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/students/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm(FORM_KOSONG);
    setFotoFile(null);
    setError('');
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setEditFotoFile(null);
    setEditData({
      name: s.user?.name || '',
      email: s.user?.email || '',
      nis: s.nis || '',
      jenis_kelamin: s.jenis_kelamin || '',
      class_room_id: s.class_room_id || '',
      jurusan_id: s.jurusan_id || '',
      tempat_lahir: s.tempat_lahir || '',
      tanggal_lahir: s.tanggal_lahir || '',
      alamat: s.alamat || '',
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/students/${id}`, editData);
      if (editFotoFile) {
        const fd = new FormData();
        fd.append('foto', editFotoFile);
        await api.post(`/students/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setEditId(null);
      setEditFotoFile(null);
      loadStudents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      alert(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get('/students/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_siswa.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      loadStudents();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.message || 'Gagal mengimpor data. Pastikan format file sesuai template.',
        gagal: [],
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleFotoMassalClick = () => fotoMassalRef.current?.click();

  const handleFotoMassalChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFotoMassal(true);
    setFotoMassalResult(null);

    const formData = new FormData();
    for (const file of files) formData.append('files[]', file);

    try {
      const res = await api.post('/students/foto-massal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFotoMassalResult(res.data);
      loadStudents();
    } catch (err) {
      setFotoMassalResult({
        message: err.response?.data?.message || 'Gagal mengunggah foto.',
        gagal: [],
      });
    } finally {
      setUploadingFotoMassal(false);
      e.target.value = '';
    }
  };

  const downloadAllQR = async () => {
  try {
    const zip = new JSZip();

    for (const s of students) {
      const dataUrl = await QRCode.toDataURL(s.qr_code, {
        width: 400,
        margin: 2,
      });

      const base64 = dataUrl.replace(
        /^data:image\/png;base64,/,
        ""
      );

      zip.file(
        `${s.nis}_${s.user?.name || "Siswa"}.png`,
        base64,
        { base64: true }
      );
    }

    const content = await zip.generateAsync({
      type: "blob",
    });

    saveAs(content, "qrcode_siswa.zip");
  } catch (err) {
    console.error(err);
    alert("Gagal membuat ZIP QR Code.");
  }
};

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data Siswa dari Excel</h2>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
        >
          <Download className="w-4 h-4" /> Download Template
        </button>
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl px-4 py-2 transition"
        >
          <Upload className="w-4 h-4" /> {importing ? 'Mengimpor...' : 'Import Excel'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleFotoMassalClick}
          disabled={uploadingFotoMassal}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 border border-line-200 rounded-xl px-4 py-2 transition"
          title="Nama file harus sesuai NIS siswa, mis. 40263136.jpg"
        >
          <ImagePlus className="w-4 h-4" /> {uploadingFotoMassal ? 'Mengunggah...' : 'Upload Foto Massal (nama file = NIS)'}
        </button>
        <input
          ref={fotoMassalRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFotoMassalChange}
          className="hidden"
        />
      </div>

      {importResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${importResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
            {importResult.message}
          </p>
          {importResult.gagal?.length > 0 && (
            <div className="table-scroll">
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Baris</th>
                  <th className="font-medium whitespace-nowrap px-2">Kolom</th>
                  <th className="font-medium whitespace-nowrap px-2">Alasan Gagal</th>
                </tr>
              </thead>
              <tbody>
                {importResult.gagal.map((g, i) => (
                  <tr key={i} className="border-t border-line-200">
                    <td className="py-2 text-ink-900 whitespace-nowrap px-2">{g.baris}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{g.kolom}</td>
                    <td className="text-honey-700 whitespace-nowrap px-2"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {fotoMassalResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${fotoMassalResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
            {fotoMassalResult.message}
          </p>
          {fotoMassalResult.gagal?.length > 0 && (
            <div className="table-scroll">
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">File</th>
                  <th className="font-medium whitespace-nowrap px-2">Alasan Gagal</th>
                </tr>
              </thead>
              <tbody>
                {fotoMassalResult.gagal.map((g, i) => (
                  <tr key={i} className="border-t border-line-200">
                    <td className="py-2 text-ink-900 whitespace-nowrap px-2"><TruncateText text={g.file} maxWidth="12rem" /></td>
                    <td className="text-honey-700 whitespace-nowrap px-2"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Siswa Baru</h2>
          <p className="text-xs text-ink-500 mb-4">Password akun otomatis dibuat "123456" — wajib diganti siswa saat login pertama.</p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
            <input placeholder="NIS" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} className="field-input" required />
            <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="field-input text-ink-700">
              <option value="">— Jenis Kelamin —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Kelas (opsional) —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.jurusan_id} onChange={(e) => setForm({ ...form, jurusan_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Jurusan (opsional) —</option>
              {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
            <input placeholder="Tempat Lahir (opsional)" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} className="field-input" />
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Tanggal Lahir (opsional)</label>
              <DateInput value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className="field-input w-full" />
            </div>
            <input placeholder="Alamat (opsional)" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input col-span-2" />
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1.5"><ImagePlus className="w-3.5 h-3.5" /> Foto Siswa (opsional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files[0] || null)} className="text-sm" />
          </div>
          <div className="flex gap-2 mt-4">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Siswa'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Siswa <span className="text-ink-500 font-sans font-normal text-sm">({students.length})</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadAllQR}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl px-4 py-2 transition"
            >
              Download Semua QR
            </button>
            <button
              onClick={() => window.open('/print/kartu-pelajar', '_blank')}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
            >
              <Printer className="w-4 h-4" /> Cetak Kartu Pelajar
            </button>
            {!showForm && (
              <button onClick={() => { setForm(FORM_KOSONG); setFotoFile(null); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            )}
          </div>
        </div>
        <p className="md:hidden text-xs text-ink-400 mb-1.5">← Geser tabel untuk lihat kolom lainnya →</p>
        <div className="table-scroll">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th><th className="font-medium whitespace-nowrap px-2">Email</th><th className="font-medium whitespace-nowrap px-2">NIS</th><th className="font-medium whitespace-nowrap px-2">Jenis Kelamin</th><th className="font-medium whitespace-nowrap px-2">Kelas</th><th className="font-medium whitespace-nowrap px-2">Jurusan</th><th className="font-medium whitespace-nowrap px-2">QR Code</th><th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [];
              let lastKelas = null;
              sortedHalaman.forEach((s) => {
                const kelasName = s.class_room?.name || null;
                if (kelasName !== lastKelas) {
                  rows.push(
                    <tr key={`header-${kelasName}`}>
                      <td colSpan="8" className="pt-4 pb-1 whitespace-nowrap px-2">
                        <span className="badge-soft badge-brand text-[11px]">
                          {kelasName || 'Belum Ada Kelas'}
                        </span>
                      </td>
                    </tr>
                  );
                  lastKelas = kelasName;
                }
                if (editId === s.id) {
                  rows.push(
                    <tr key={s.id} className="border-t border-line-200 bg-mist-50">
                      <td colSpan="8" className="py-3 whitespace-nowrap px-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama" />
                          <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Email" type="email" />
                          <input value={editData.nis} onChange={(e) => setEditData({ ...editData, nis: e.target.value })} className="field-input py-1.5 text-sm" placeholder="NIS" />
                          <select value={editData.jenis_kelamin} onChange={(e) => setEditData({ ...editData, jenis_kelamin: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                            <option value="">— Jenis Kelamin —</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                          <select value={editData.class_room_id} onChange={(e) => setEditData({ ...editData, class_room_id: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                            <option value="">— Belum Ada Kelas —</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select value={editData.jurusan_id} onChange={(e) => setEditData({ ...editData, jurusan_id: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                            <option value="">— Belum Ada Jurusan —</option>
                            {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                          </select>
                          <input value={editData.tempat_lahir} onChange={(e) => setEditData({ ...editData, tempat_lahir: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Tempat Lahir" />
                          <DateInput value={editData.tanggal_lahir} onChange={(e) => setEditData({ ...editData, tanggal_lahir: e.target.value })} className="field-input py-1.5 text-sm w-full" />
                          <input value={editData.alamat} onChange={(e) => setEditData({ ...editData, alamat: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Alamat" />
                        </div>
                        <div className="mb-2">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1"><ImagePlus className="w-3.5 h-3.5" /> Ganti Foto (kosongkan kalau tidak diubah)</label>
                          <input type="file" accept="image/*" onChange={(e) => setEditFotoFile(e.target.files[0] || null)} className="text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(s.id)} disabled={saving} className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                            <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                        </div>
                      </td>
                    </tr>
                  );
                  return;
                }
                rows.push(
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">
                      <div className="flex items-center gap-2">
                        {s.foto_url ? (
                          <img src={s.foto_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <UserRound className="w-6 h-6 text-ink-300 shrink-0" />
                        )}
                        <TruncateText text={s.user?.name} />
                      </div>
                    </td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={s.user?.email} /></td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{s.nis}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{JK_LABEL[s.jenis_kelamin] || '-'}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{s.class_room?.name || '-'}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{s.jurusan?.nama || '-'}</td>
                    <td className="font-mono text-xs text-brand-600 whitespace-nowrap px-2">{s.qr_code}</td>
                    <td className="text-right whitespace-nowrap px-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(s)} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleResetPassword(s.id, s.user?.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.user?.name)} className="text-ink-300 hover:text-honey-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              });
              return rows;
            })()}
            {students.length === 0 && (
              <tr><td colSpan="8" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada siswa.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
