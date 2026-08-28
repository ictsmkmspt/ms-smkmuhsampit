import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Download, Upload, Save, KeyRound } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { useAuth } from '../../../context/AuthContext';
import { namaKeEmailSekolah } from '../../../utils/email';

const JK_LABEL = { L: 'Laki-laki', P: 'Perempuan' };

export default function TeachersTab() {
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'waka_kurikulum';
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', nip: '', jenis_kelamin: '', max_jam_mengajar: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Email auto-terisi dari Nama (nama disambung tanpa spasi + domain sekolah)
  // selama pengguna belum mengetik sendiri di kolom Email — begitu diketik
  // manual, auto-isi berhenti supaya tidak menimpa email yang sudah disunting.
  const emailManual = useRef(false);

  const { page, setPage, totalPages, paginated: teachersHalaman } = usePagination(teachers, 40);

  const loadTeachers = () => api.get('/teachers').then((res) => setTeachers(res.data)).catch(() => alert('Gagal memuat daftar guru.'));
  useEffect(() => { loadTeachers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/teachers', form);
      setForm({ name: '', email: '', nip: '', jenis_kelamin: '', max_jam_mengajar: '' });
      emailManual.current = false;
      setShowForm(false);
      loadTeachers();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menambah guru.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus guru "${name}"?`)) return;
    try {
      await api.delete(`/teachers/${id}`);
      loadTeachers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus guru.');
    }
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password guru "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/teachers/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm({ name: '', email: '', nip: '', jenis_kelamin: '', max_jam_mengajar: '' });
    emailManual.current = false;
    setError('');
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEditData({ name: t.user?.name || '', email: t.user?.email || '', nip: t.nip || '', jenis_kelamin: t.jenis_kelamin || '', max_jam_mengajar: t.max_jam_mengajar ?? '' });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/teachers/${id}`, editData);
      setEditId(null);
      loadTeachers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get('/teachers/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_guru.xlsx');
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
      const res = await api.post('/teachers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      loadTeachers();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.message || 'Gagal mengimpor data. Pastikan format file sesuai template.',
        gagal: [],
      });
    } finally {
      setImporting(false);
      e.target.value = ''; // reset supaya file yang sama bisa diupload ulang kalau perlu
    }
  };

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Data Guru hanya bisa dilihat di sini — perubahan data guru dikelola oleh Admin.</p>
        </div>
      )}

      {canEdit && (
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data Guru dari Excel</h2>
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
      </div>
      )}

      {canEdit && importResult && (
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

      {canEdit && showForm && (
      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Guru Baru</h2>
        <p className="text-xs text-ink-500 mb-4">Password akun otomatis dibuat "123456" — wajib diganti guru saat login pertama.</p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => {
            const name = e.target.value;
            setForm((f) => ({ ...f, name, email: emailManual.current ? f.email : namaKeEmailSekolah(name) }));
          }} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => { emailManual.current = true; setForm({ ...form, email: e.target.value }); }} className="field-input" required autoComplete="off" />
          <input placeholder="NIP" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} className="field-input col-span-2" required />
          <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="field-input text-ink-700">
            <option value="">— Jenis Kelamin —</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <input type="number" min="0" max="60" placeholder="Maks Jam Mengajar/Minggu (opsional)" value={form.max_jam_mengajar} onChange={(e) => setForm({ ...form, max_jam_mengajar: e.target.value })} className="field-input" />
        </div>
        <div className="flex gap-2 mt-4">
          <button disabled={loading} className="btn-primary">
            <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Guru'}
          </button>
          <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
        </div>
      </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Guru <span className="text-ink-500 font-sans font-normal text-sm">({teachers.length})</span></h2>
          {canEdit && !showForm && (
            <button onClick={() => { setForm({ name: '', email: '', nip: '', jenis_kelamin: '', max_jam_mengajar: '' }); emailManual.current = false; setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Guru
            </button>
          )}
        </div>
        <p className="md:hidden text-xs text-ink-400 mb-1.5">← Geser tabel untuk lihat kolom lainnya →</p>
        <div className="table-scroll">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th><th className="font-medium whitespace-nowrap px-2">Email</th><th className="font-medium whitespace-nowrap px-2">NIP</th><th className="font-medium whitespace-nowrap px-2">Jenis Kelamin</th><th className="font-medium whitespace-nowrap px-2">Maks Jam Mengajar</th>{canEdit && <th className="whitespace-nowrap px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {teachersHalaman.map((t) => (
              editId === t.id ? (
                <tr key={t.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="6" className="py-3 whitespace-nowrap px-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama" />
                      <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Email" type="email" />
                      <input value={editData.nip} onChange={(e) => setEditData({ ...editData, nip: e.target.value })} className="field-input py-1.5 text-sm" placeholder="NIP" />
                      <select value={editData.jenis_kelamin} onChange={(e) => setEditData({ ...editData, jenis_kelamin: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                        <option value="">— Jenis Kelamin —</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                      <input type="number" min="0" max="60" placeholder="Maks Jam Mengajar/Minggu" value={editData.max_jam_mengajar} onChange={(e) => setEditData({ ...editData, max_jam_mengajar: e.target.value })} className="field-input py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(t.id)} disabled={saving} className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={t.user?.name} /></td>
                  <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={t.user?.email} /></td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{t.nip}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{JK_LABEL[t.jenis_kelamin] || '-'}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{t.max_jam_mengajar != null ? `${t.max_jam_mengajar} jam/minggu` : '-'}</td>
                  {canEdit && (
                    <td className="text-right whitespace-nowrap px-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(t)} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleResetPassword(t.id, t.user?.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id, t.user?.name)} className="text-ink-300 hover:text-honey-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan="6" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada guru.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
