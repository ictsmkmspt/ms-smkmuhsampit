import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Lock, AlertOctagon } from 'lucide-react';
import api from '../../../api/axios';

export default function PoinPelanggaranTab() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', poin: '' });
  const [editId, setEditId] = useState(null);
  const [editPoin, setEditPoin] = useState({});
  const [error, setError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState({});

  const load = () => api.get('/violation-types').then((res) => setTypes(res.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setAddLoading(true);
    try {
      await api.post('/violation-types', form);
      setForm({ name: '', poin: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah jenis pelanggaran.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSavePoin = async (type) => {
    setSaveLoading((p) => ({ ...p, [type.id]: true }));
    try {
      await api.put(`/violation-types/${type.id}`, {
        name: type.system_key ? undefined : (editPoin[type.id]?.name ?? type.name),
        poin: editPoin[type.id]?.poin ?? type.poin,
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
    if (!confirm(`Hapus jenis pelanggaran "${type.name}"?`)) return;
    try {
      await api.delete(`/violation-types/${type.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  const startEdit = (type) => {
    setEditId(type.id);
    setEditPoin((p) => ({ ...p, [type.id]: { name: type.name, poin: type.poin } }));
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <AlertOctagon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Jenis <b>Terlambat</b> dan <b>Tidak Hadir</b> adalah jenis <b>sistem</b> — dicatat otomatis oleh sistem absensi. Kamu hanya bisa mengubah <b>poin</b>-nya, namanya dikunci. Jenis custom yang kamu tambah sendiri bisa diedit dan dihapus.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Jenis Pelanggaran</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <input
            placeholder="Nama jenis (contoh: Tidak Pakai Seragam)"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input flex-1" required
          />
          <input
            type="number" min="0" max="100" placeholder="Poin"
            value={form.poin} onChange={(e) => setForm({ ...form, poin: e.target.value })}
            className="field-input w-24" required
          />
          <button disabled={addLoading} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {addLoading ? '...' : 'Tambah'}
          </button>
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Jenis Pelanggaran <span className="text-ink-500 font-sans font-normal text-sm">({types.length})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama Jenis</th>
              <th className="pb-2 font-medium text-center w-32">Poin</th>
              <th className="pb-2 font-medium text-center w-24">Tipe</th>
              <th className="pb-2 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-line-200">
                <td className="py-2.5">
                  {editId === t.id && !t.system_key ? (
                    <input
                      value={editPoin[t.id]?.name ?? t.name}
                      onChange={(e) => setEditPoin((p) => ({ ...p, [t.id]: { ...p[t.id], name: e.target.value } }))}
                      className="field-input py-1"
                    />
                  ) : (
                    <span className="text-ink-900">{t.name}</span>
                  )}
                </td>
                <td className="text-center">
                  {editId === t.id ? (
                    <input
                      type="number" min="0" max="100"
                      value={editPoin[t.id]?.poin ?? t.poin}
                      onChange={(e) => setEditPoin((p) => ({ ...p, [t.id]: { ...p[t.id], poin: e.target.value } }))}
                      className="field-input py-1 text-center w-20 mx-auto"
                    />
                  ) : (
                    <span className="badge-soft badge-honey">{t.poin} poin</span>
                  )}
                </td>
                <td className="text-center">
                  {t.system_key ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-ink-400">
                      <Lock className="w-3 h-3" /> Sistem
                    </span>
                  ) : (
                    <span className="badge-soft badge-brand">Custom</span>
                  )}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {editId === t.id ? (
                      <>
                        <button onClick={() => handleSavePoin(t)} disabled={saveLoading[t.id]} className="text-brand-600 hover:text-brand-800" title="Simpan">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-ink-300 hover:text-ink-500 text-xs px-1">Batal</button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(t)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                        Edit Poin
                      </button>
                    )}
                    {!t.system_key && editId !== t.id && (
                      <button onClick={() => handleDelete(t)} className="text-ink-300 hover:text-honey-700 ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300">Belum ada jenis pelanggaran.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
