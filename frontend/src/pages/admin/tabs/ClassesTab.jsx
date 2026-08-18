import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Check, GraduationCap } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { useAuth } from '../../../context/AuthContext';

export default function ClassesTab() {
  const { user } = useAuth();
  // Waka Kesiswaan tidak boleh hapus kelas (data siswa & riwayatnya ikut
  // berisiko) — cuma admin. Backend-nya juga sudah dibatasi begitu.
  const canDelete = user.role === 'admin';
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      setShowForm(false);
      loadClasses();
    } catch {
      setError('Gagal menambah kelas.');
    } finally {
      setLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setName('');
    setError('');
  };

  const handleDelete = async (id, className) => {
    if (!confirm(`Hapus kelas "${className}"? Siswa di kelas ini tidak akan terhapus, hanya jadi tanpa kelas.`)) return;
    await api.delete(`/classes/${id}`);
    loadClasses();
  };

  const handleLuluskan = async (c) => {
    if (!confirm(`Luluskan ${c.students_count ?? 0} siswa aktif di kelas "${c.name}"? Mereka akan pindah ke menu Alumni, datanya tidak akan hilang.`)) return;
    try {
      const res = await api.post(`/classes/${c.id}/luluskan`);
      alert(res.data.message);
      loadClasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal meluluskan kelas ini.');
    }
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
      {showForm && (
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
            <div className="flex gap-2">
              <button disabled={loading} className="btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Kelas'}
              </button>
              <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Kelas <span className="text-ink-500 font-sans font-normal text-sm">({classes.length})</span></h2>
          {!showForm && (
            <button onClick={() => { setName(''); setError(''); setShowForm(true); }} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Kelas</button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Kelas</th>
              <th className="font-medium whitespace-nowrap px-2">Jumlah Siswa</th>
              <th className="font-medium whitespace-nowrap px-2">Wali Kelas</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const isEditing = editingId === c.id;

              if (isEditing) {
                return (
                  <tr key={c.id} className="border-t border-line-200 bg-mist-50">
                    <td className="py-2.5 whitespace-nowrap px-2" colSpan="4">
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
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{c.name}</td>
                  <td className="whitespace-nowrap px-2"><span className="badge-soft badge-brand">{c.students_count ?? 0} siswa</span></td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{c.homeroom_teacher?.user?.name ? <TruncateText text={c.homeroom_teacher.user.name} /> : <span className="text-ink-300">— Belum ada —</span>}</td>
                  <td className="text-right whitespace-nowrap px-2">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEdit(c)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                        Edit
                      </button>
                      <button onClick={() => handleLuluskan(c)} disabled={!c.students_count} className="text-ink-300 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-300" title="Luluskan Semua Siswa Aktif di Kelas Ini">
                        <GraduationCap className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDelete(c.id, c.name)} className="text-ink-300 hover:text-honey-700" title="Hapus Kelas">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {classes.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada kelas.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
