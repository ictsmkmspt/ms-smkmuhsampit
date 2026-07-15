import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import api from '../../../api/axios';

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', nis: '', class_room_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadStudents = () => api.get('/students').then((res) => setStudents(res.data));
  const loadClasses = () => api.get('/classes').then((res) => setClasses(res.data));

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/students', form);
      setForm({ name: '', email: '', password: '', nis: '', class_room_id: '' });
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
        <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Siswa Baru</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input" required autoComplete="new-password" />
          <input placeholder="NIS" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} className="field-input" required />
          <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value })} className="field-input col-span-2 text-ink-700">
            <option value="">— Pilih Kelas (opsional) —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Siswa'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Siswa <span className="text-ink-500 font-sans font-normal text-sm">({students.length})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th><th className="font-medium">NIS</th><th className="font-medium">Kelas</th><th className="font-medium">Barcode</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const sorted = [...students].sort((a, b) => {
                const kelasA = a.class_room?.name || 'ZZZZZ';
                const kelasB = b.class_room?.name || 'ZZZZZ';
                if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
                return (a.user?.name || '').localeCompare(b.user?.name || '');
              });

              const rows = [];
              let lastKelas = null;
              sorted.forEach((s) => {
                const kelasName = s.class_room?.name || null;
                if (kelasName !== lastKelas) {
                  rows.push(
                    <tr key={`header-${kelasName}`}>
                      <td colSpan="5" className="pt-4 pb-1">
                        <span className="badge-soft badge-brand text-[11px]">
                          {kelasName || 'Belum Ada Kelas'}
                        </span>
                      </td>
                    </tr>
                  );
                  lastKelas = kelasName;
                }
                rows.push(
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900">{s.user?.name}</td>
                    <td className="text-ink-700">{s.nis}</td>
                    <td className="text-ink-700">{s.class_room?.name || '-'}</td>
                    <td className="font-mono text-xs text-brand-600">{s.barcode_code}</td>
                    <td className="text-right">
                      <button onClick={() => handleDelete(s.id, s.user?.name)} className="text-ink-300 hover:text-honey-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              });
              return rows;
            })()}
            {students.length === 0 && (
              <tr><td colSpan="5" className="py-6 text-center text-ink-300">Belum ada siswa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
