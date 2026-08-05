import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

export default function TeachingAssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_room_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/teaching-assignments').then((res) => setAssignments(res.data));
  useEffect(() => {
    load();
    api.get('/teachers').then((res) => setTeachers(res.data));
    api.get('/subjects').then((res) => setSubjects(res.data));
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/teaching-assignments', form);
      setForm({ teacher_id: '', subject_id: '', class_room_id: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah penugasan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus penugasan "${a.subject?.nama}" di kelas "${a.class_room?.name}"?`)) return;
    await api.delete(`/teaching-assignments/${a.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">Pembagian tugas mengajar untuk tahun ajaran yang sedang aktif.</p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Penugasan</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value })} className="field-input text-ink-700" required>
            <option value="">Pilih Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="field-input text-ink-700" required>
            <option value="">Pilih Mata Pelajaran</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="field-input text-ink-700" required>
            <option value="">Pilih Guru</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
          </select>
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Penugasan'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Penugasan <span className="text-ink-500 font-sans font-normal text-sm">({assignments.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Kelas</th>
              <th className="font-medium">Mata Pelajaran</th>
              <th className="font-medium">Guru</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{a.class_room?.name}</td>
                <td className="text-ink-700">{a.subject?.nama}</td>
                <td className="text-ink-700">{a.teacher?.user?.name}</td>
                <td className="text-right"><button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {assignments.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-ink-300">Belum ada penugasan untuk tahun ajaran aktif.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
