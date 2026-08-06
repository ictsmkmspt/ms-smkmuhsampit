import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, UserPlus, Link2, Download, Upload, KeyRound } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

// Wali yang semua anaknya sudah lulus tidak ditampilkan di sini lagi —
// datanya pindah tampil di menu Alumni > Wali Siswa Alumni (tetap tidak
// pernah terhapus, cuma dikelompokkan beda sesuai status siswa).
const isWaliAlumni = (p) => (p.children?.length ?? 0) > 0 && p.children.every((c) => c.status === 'lulus');

export default function WaliTab() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [linkingId, setLinkingId] = useState(null);
  const [linkForm, setLinkForm] = useState({ student_id: '', hubungan: '' });
  const [linkError, setLinkError] = useState('');

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadParents = () => api.get('/parents').then((res) => setParents(res.data));
  const loadStudents = () => api.get('/students').then((res) => setStudents(res.data));

  useEffect(() => {
    loadParents();
    loadStudents();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/parents', form);
      setForm({ name: '', phone: '' });
      loadParents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menambah akun wali.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParent = async (id, name) => {
    if (!confirm(`Hapus akun wali "${name}"? Semua hubungan ke anak juga akan terhapus.`)) return;
    await api.delete(`/parents/${id}`);
    loadParents();
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password akun wali "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/parents/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const openLinkForm = (parentId) => {
    setLinkingId(parentId);
    setLinkForm({ student_id: '', hubungan: '' });
    setLinkError('');
  };

  const handleLink = async (parentId) => {
    setLinkError('');
    try {
      await api.post(`/parents/${parentId}/link`, linkForm);
      setLinkingId(null);
      loadParents();
    } catch (err) {
      setLinkError(err.response?.data?.message || 'Gagal menghubungkan siswa.');
    }
  };

  const handleUnlink = async (parentId, studentId, studentName) => {
    if (!confirm(`Lepas hubungan ke "${studentName}"?`)) return;
    await api.delete(`/parents/${parentId}/link/${studentId}`);
    loadParents();
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get('/parents/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_wali.xlsx');
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
      const res = await api.post('/parents/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      loadParents();
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

  const parentsAktif = parents.filter((p) => !isWaliAlumni(p));

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data Wali dari Excel</h2>
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
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
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
                    <td className="text-honey-700"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-600" /> Tambah Akun Wali Baru
        </h2>
        <p className="text-xs text-ink-500 mb-4">Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.</p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field-input" required autoComplete="off" />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun Wali'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Wali <span className="text-ink-500 font-sans font-normal text-sm">({parentsAktif.length})</span>
        </h2>

        <div className="space-y-4">
          {parentsAktif.map((p) => (
            <div key={p.id} className="border border-line-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openLinkForm(p.id)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg px-3 py-1.5 transition"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Hubungkan Anak
                  </button>
                  <button onClick={() => handleResetPassword(p.id, p.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteParent(p.id, p.name)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {p.children?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.children.map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5 text-xs bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-ink-900 font-medium">{c.user?.name}</span>
                      <span className="text-ink-400">· {c.class_room?.name || '-'}</span>
                      {c.pivot?.hubungan && <span className="text-ink-400">({c.pivot.hubungan})</span>}
                      <button onClick={() => handleUnlink(p.id, c.id, c.user?.name)} className="text-ink-300 hover:text-honey-700 ml-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-300 italic">Belum ada anak terhubung.</p>
              )}

              {linkingId === p.id && (
                <div className="mt-3 pt-3 border-t border-line-200 flex flex-wrap items-end gap-2">
                  {linkError && <p className="w-full text-xs text-honey-700">{linkError}</p>}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Siswa</label>
                    <select
                      value={linkForm.student_id}
                      onChange={(e) => setLinkForm({ ...linkForm, student_id: e.target.value })}
                      className="field-input text-sm"
                    >
                      <option value="">— Pilih Siswa —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.user?.name} ({s.class_room?.name || 'Belum ada kelas'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Hubungan (opsional)</label>
                    <input
                      placeholder="Ayah / Ibu / Wali"
                      value={linkForm.hubungan}
                      onChange={(e) => setLinkForm({ ...linkForm, hubungan: e.target.value })}
                      className="field-input text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleLink(p.id)}
                    disabled={!linkForm.student_id}
                    className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-lg px-3 py-2 transition"
                  >
                    Simpan
                  </button>
                  <button onClick={() => setLinkingId(null)} className="text-xs font-medium text-ink-500 hover:bg-mist-50 rounded-lg px-3 py-2 transition">
                    Batal
                  </button>
                </div>
              )}
            </div>
          ))}
          {parentsAktif.length === 0 && (
            <p className="py-6 text-center text-ink-300 text-sm">Belum ada akun wali.</p>
          )}
        </div>
      </div>
    </div>
  );
}
