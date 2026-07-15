import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, Link2 } from 'lucide-react';
import api from '../../../api/axios';

export default function WaliTab() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [linkingId, setLinkingId] = useState(null);
  const [linkForm, setLinkForm] = useState({ student_id: '', hubungan: '' });
  const [linkError, setLinkError] = useState('');

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
      setForm({ name: '', email: '', password: '' });
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-600" /> Tambah Akun Wali Baru
        </h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input" required autoComplete="new-password" />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun Wali'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Wali <span className="text-ink-500 font-sans font-normal text-sm">({parents.length})</span>
        </h2>

        <div className="space-y-4">
          {parents.map((p) => (
            <div key={p.id} className="border border-line-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openLinkForm(p.id)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg px-3 py-1.5 transition"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Hubungkan Anak
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
          {parents.length === 0 && (
            <p className="py-6 text-center text-ink-300 text-sm">Belum ada akun wali.</p>
          )}
        </div>
      </div>
    </div>
  );
}
