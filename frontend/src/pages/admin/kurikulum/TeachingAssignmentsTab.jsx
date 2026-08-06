import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import api from '../../../api/axios';

export default function TeachingAssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_room_id: '', target_jam: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editJam, setEditJam] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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
      await api.post('/teaching-assignments', { ...form, target_jam: form.target_jam || null });
      setForm({ teacher_id: '', subject_id: '', class_room_id: '', target_jam: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah penugasan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus penugasan "${a.subject?.nama}" di kelas "${a.class_room?.name}"? Isian jadwal yang sudah ditempatkan dari penugasan ini ikut terhapus.`)) return;
    await api.delete(`/teaching-assignments/${a.id}`);
    load();
  };

  const startEditJam = (a) => {
    setEditingId(a.id);
    setEditJam(a.target_jam ?? '');
  };
  const cancelEditJam = () => setEditingId(null);
  const saveEditJam = async (a) => {
    setEditSaving(true);
    try {
      await api.put(`/teaching-assignments/${a.id}`, { teacher_id: a.teacher_id, target_jam: editJam || null });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan target jam.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">Pembagian tugas mengajar untuk tahun ajaran yang sedang aktif.</p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Penugasan</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
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
          <input
            type="number" min="1" placeholder="Target jam (opsional)"
            value={form.target_jam} onChange={(e) => setForm({ ...form, target_jam: e.target.value })}
            className="field-input"
          />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Penugasan'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Daftar Penugasan <span className="text-ink-500 font-sans font-normal text-sm">({assignments.length})</span></h2>
        <p className="text-xs text-ink-500 mb-4">Kolom "Terjadwal" menghitung otomatis dari isian di menu Jadwal Pelajaran. Target jam boleh dikosongkan kalau memang tidak dipatok rata per minggu (mis. mapel blok/kejuruan).</p>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Kelas</th>
              <th className="font-medium">Mata Pelajaran</th>
              <th className="font-medium">Guru</th>
              <th className="font-medium">Terjadwal / Target Jam</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{a.class_room?.name}</td>
                <td className="text-ink-700">{a.subject?.nama}</td>
                <td className="text-ink-700">{a.teacher?.user?.name}</td>
                <td className="text-ink-700">
                  {editingId === a.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="1" autoFocus
                        value={editJam} onChange={(e) => setEditJam(e.target.value)}
                        className="field-input py-1 px-2 text-sm w-20"
                        placeholder="-"
                      />
                      <button onClick={() => saveEditJam(a)} disabled={editSaving} className="text-brand-600 hover:text-brand-800"><Check className="w-4 h-4" /></button>
                      <button onClick={cancelEditJam} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEditJam(a)} className="flex items-center gap-1.5 hover:text-brand-700">
                      <span className={a.target_jam && a.schedules_count >= a.target_jam ? 'font-medium text-brand-700' : ''}>
                        {a.schedules_count ?? 0} / {a.target_jam ?? '-'} jam
                      </span>
                      <Pencil className="w-3 h-3 text-ink-300" />
                    </button>
                  )}
                </td>
                <td className="text-right"><button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {assignments.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-ink-300">Belum ada penugasan untuk tahun ajaran aktif.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
