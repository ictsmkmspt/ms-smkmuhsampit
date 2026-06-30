import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

export default function ClassesTab() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadClasses = () => api.get('/classes').then((res) => setClasses(res.data));
  useEffect(() => { loadClasses(); }, []);

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
              <th className="pb-2 font-medium">Nama Kelas</th><th className="font-medium">Jumlah Siswa</th><th></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{c.name}</td>
                <td><span className="badge-soft badge-brand">{c.students_count ?? 0} siswa</span></td>
                <td className="text-right">
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada kelas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
