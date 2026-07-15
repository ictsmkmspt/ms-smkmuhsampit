import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import api from '../../../api/axios';

export default function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', nip: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadTeachers = () => api.get('/teachers').then((res) => setTeachers(res.data));
  useEffect(() => { loadTeachers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/teachers', form);
      setForm({ name: '', email: '', password: '', nip: '' });
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
    await api.delete(`/teachers/${id}`);
    loadTeachers();
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

      {importResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${importResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
            {importResult.message}
          </p>
          {importResult.gagal?.length > 0 && (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium">Baris</th>
                  <th className="font-medium">Kolom</th>
                  <th className="font-medium">Alasan Gagal</th>
                </tr>
              </thead>
              <tbody>
                {importResult.gagal.map((g, i) => (
                  <tr key={i} className="border-t border-line-200">
                    <td className="py-2 text-ink-900">{g.baris}</td>
                    <td className="text-ink-700">{g.kolom}</td>
                    <td className="text-honey-700">{g.alasan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Guru Baru</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input" required autoComplete="new-password" />
          <input placeholder="NIP" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} className="field-input" required />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Guru'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Guru <span className="text-ink-500 font-sans font-normal text-sm">({teachers.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th><th className="font-medium">Email</th><th className="font-medium">NIP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{t.user?.name}</td>
                <td className="text-ink-700">{t.user?.email}</td>
                <td className="text-ink-700">{t.nip}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(t.id, t.user?.name)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300">Belum ada guru.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
