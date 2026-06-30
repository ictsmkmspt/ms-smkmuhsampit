import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', nis: '', class_room_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
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
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Siswa <span className="text-ink-500 font-sans font-normal text-sm">({students.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th><th className="font-medium">NIS</th><th className="font-medium">Kelas</th><th className="font-medium">Barcode</th><th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
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
            ))}
            {students.length === 0 && (
              <tr><td colSpan="5" className="py-6 text-center text-ink-300">Belum ada siswa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
