import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Trophy } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

export default function PoinPrestasiTab() {
  const [types, setTypes]           = useState([]);
  const [form, setForm]             = useState({ name: '', poin: '' });
  const [editId, setEditId]         = useState(null);
  const [editData, setEditData]     = useState({});
  const [error, setError]           = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState({});
  const [showForm, setShowForm]     = useState(false);

  const load = () => api.get('/achievement-types').then((res) => setTypes(res.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setAddLoading(true);
    try {
      await api.post('/achievement-types', form);
      setForm({ name: '', poin: '' });
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah jenis prestasi.');
    } finally {
      setAddLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm({ name: '', poin: '' });
    setError('');
  };

  const handleSave = async (type) => {
    setSaveLoading((p) => ({ ...p, [type.id]: true }));
    try {
      await api.put(`/achievement-types/${type.id}`, {
        name: editData[type.id]?.name ?? type.name,
        poin: editData[type.id]?.poin ?? type.poin,
      });
      load();
      setEditId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setSaveLoading((p) => ({ ...p, [type.id]: false }));
    }
  };

  const handleDelete = async (type) => {
    if (!confirm(`Hapus jenis prestasi "${type.name}"?`)) return;
    try {
      await api.delete(`/achievement-types/${type.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  const startEdit = (type) => {
    setEditId(type.id);
    setEditData((p) => ({ ...p, [type.id]: { name: type.name, poin: type.poin } }));
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Trophy className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Jenis prestasi digunakan guru untuk mencatat pencapaian siswa. Poin prestasi <b>tidak</b> mengurangi poin pelanggaran — keduanya dihitung terpisah.
        </p>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-900">Tambah Jenis Prestasi</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              placeholder="Nama jenis (contoh: Juara Lomba OSN)"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field-input sm:flex-1" required
            />
            <input
              type="number" min="0" max="100" placeholder="Poin"
              value={form.poin} onChange={(e) => setForm({ ...form, poin: e.target.value })}
              className="field-input sm:w-24" required
            />
            <div className="flex gap-2">
              <button disabled={addLoading} className="btn-primary whitespace-nowrap justify-center">
                <Plus className="w-4 h-4" />
                {addLoading ? '...' : 'Tambah'}
              </button>
              <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Jenis Prestasi <span className="text-ink-500 font-sans font-normal text-sm">({types.length})</span>
          </h2>
          {!showForm && (
            <button onClick={() => { setForm({ name: '', poin: '' }); setError(''); setShowForm(true); }} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Jenis Prestasi</button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Jenis</th>
              <th className="pb-2 font-medium text-center w-32 whitespace-nowrap px-2">Poin</th>
              <th className="pb-2 w-28 whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-line-200">
                <td className="py-2.5 whitespace-nowrap px-2">
                  {editId === t.id ? (
                    <input value={editData[t.id]?.name ?? t.name}
                      onChange={(e) => setEditData((p) => ({ ...p, [t.id]: { ...p[t.id], name: e.target.value } }))}
                      className="field-input py-1" />
                  ) : (
                    <TruncateText text={t.name} className="text-ink-900" />
                  )}
                </td>
                <td className="text-center whitespace-nowrap px-2">
                  {editId === t.id ? (
                    <input type="number" min="0" max="100"
                      value={editData[t.id]?.poin ?? t.poin}
                      onChange={(e) => setEditData((p) => ({ ...p, [t.id]: { ...p[t.id], poin: e.target.value } }))}
                      className="field-input py-1 text-center w-20 mx-auto" />
                  ) : (
                    <span className="badge-soft badge-brand">{t.poin} poin</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  <div className="flex items-center justify-end gap-1">
                    {editId === t.id ? (
                      <>
                        <button onClick={() => handleSave(t)} disabled={saveLoading[t.id]} className="text-brand-600 hover:text-brand-800" title="Simpan">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-ink-300 hover:text-ink-500 text-xs px-1">Batal</button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(t)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                        Edit
                      </button>
                    )}
                    {editId !== t.id && (
                      <button onClick={() => handleDelete(t)} className="text-ink-300 hover:text-honey-700 ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada jenis prestasi. Tambahkan dulu sebelum guru bisa mencatat prestasi siswa.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
