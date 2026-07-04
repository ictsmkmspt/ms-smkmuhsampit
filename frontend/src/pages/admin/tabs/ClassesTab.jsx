import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import api from '../../../api/axios';

export default function ClassesTab() {
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [editingId, setEditingId]   = useState(null);
  const [editName, setEditName]     = useState('');
  const [editWaliId, setEditWaliId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  const loadClasses  = () => api.get('/classes').then((res) => setClasses(res.data));
  const loadTeachers = () => api.get('/teachers').then((res) => setTeachers(res.data));

  useEffect(() => { loadClasses(); loadTeachers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/classes', { name });
      setName('');
      loadClasses();
    } catch (err) {
      setError('Gagal menambah kelas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, className) => {
    if (!confirm(`Hapus kelas "${className}"? Siswa di kelas ini tidak akan terhapus, hanya jadi tanpa kelas.`)) return;
    await api.delete(`/classes/${id}`);
    loadClasses();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditWaliId(c.homeroom_teacher?.id ?? '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const saveEdit = async (id) => {
    setEditSaving(true);
    setEditError('');
    try {
      await api.put(`/classes/${id}`, {
        name: editName,
        homeroom_teacher_id: editWaliId || null,
      });
      await loadClasses();
      setEditingId(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.homeroom_teacher_id?.[0]
        || err.response?.data?.errors?.name?.[0]
        || err.response?.data?.message
        || 'Gagal menyimpan perubahan.';
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5">
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="flex gap-3">
          <input
            placeholder="Nama Kelas (contoh: X IPA 1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input flex-1"
            required
          />
          <button disabled={loading} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Kelas'}
          </button>
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Kelas <span className="text-ink-500 font-sans font-normal text-sm">({classes.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama Kelas</th>
              <th className="font-medium">Jumlah Siswa</th>
              <th className="font-medium">Wali Kelas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const isEditing = editingId === c.id;

              if (isEditing) {
                return (
                  <tr key={c.id} className="border-t border-line-200 bg-mist-50">
                    <td className="py-2.5" colSpan="4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div>
                          <label className="block text-xs font-medium text-ink-500 mb-1">Nama Kelas</label>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="field-input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink-500 mb-1">Wali Kelas</label>
                          <select
                            value={editWaliId}
                            onChange={(e) => setEditWaliId(e.target.value)}
                            className="text-sm border border-line-200 rounded-lg px-2 py-2 text-ink-700"
                          >
                            <option value="">— Belum ada —</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>{t.user?.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end gap-2 pb-0.5">
                          <button
                            onClick={() => saveEdit(c.id)}
                            disabled={editSaving}
                            className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-lg px-3 py-2 transition"
                          >
                            <Check className="w-3.5 h-3.5" /> {editSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:bg-mist-100 rounded-lg px-3 py-2 transition"
                          >
                            <X className="w-3.5 h-3.5" /> Batal
                          </button>
                        </div>
                      </div>
                      {editError && (
                        <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mt-2 inline-block">{editError}</p>
                      )}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={c.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900">{c.name}</td>
                  <td><span className="badge-soft badge-brand">{c.students_count ?? 0} siswa</span></td>
                  <td className="text-ink-700">{c.homeroom_teacher?.user?.name || <span className="text-ink-300">— Belum ada —</span>}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEdit(c)} className="text-ink-300 hover:text-brand-600" title="Edit Kelas">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-ink-300 hover:text-honey-700" title="Hapus Kelas">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {classes.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300">Belum ada kelas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
