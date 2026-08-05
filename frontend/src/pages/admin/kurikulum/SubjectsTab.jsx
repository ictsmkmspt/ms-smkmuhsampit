import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import api from '../../../api/axios';

export default function SubjectsTab() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ kode: '', nama: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = () => api.get('/subjects').then((res) => setSubjects(res.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/subjects', form);
      setForm({ kode: '', nama: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah mata pelajaran.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s) => { setEditId(s.id); setEditForm({ kode: s.kode, nama: s.nama }); };

  const handleSave = async (id) => {
    try {
      await api.put(`/subjects/${id}`, editForm);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan.');
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Hapus mata pelajaran "${s.nama}"?`)) return;
    try {
      await api.delete(`/subjects/${s.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Mata Pelajaran</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <input placeholder="Kode (mis. MTK-10)" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="field-input w-40" required />
          <input placeholder="Nama mata pelajaran" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input flex-1" required />
          <button disabled={loading} className="btn-primary whitespace-nowrap"><Plus className="w-4 h-4" /> {loading ? '...' : 'Tambah'}</button>
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Mata Pelajaran <span className="text-ink-500 font-sans font-normal text-sm">({subjects.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium w-32">Kode</th>
              <th className="font-medium">Nama</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-t border-line-200">
                <td className="py-2.5">
                  {editId === s.id ? <input value={editForm.kode} onChange={(e) => setEditForm({ ...editForm, kode: e.target.value })} className="field-input py-1" /> : <span className="font-mono text-ink-700">{s.kode}</span>}
                </td>
                <td>
                  {editId === s.id ? <input value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="field-input py-1" /> : <span className="text-ink-900">{s.nama}</span>}
                </td>
                <td className="text-right">
                  {editId === s.id ? (
                    <>
                      <button onClick={() => handleSave(s.id)} className="text-brand-600 hover:text-brand-800" title="Simpan"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="text-ink-300 hover:text-ink-500 text-xs px-1">Batal</button>
                    </>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                      <button onClick={() => handleDelete(s)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {subjects.length === 0 && <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada mata pelajaran.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
