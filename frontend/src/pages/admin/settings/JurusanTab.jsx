import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, GraduationCap } from 'lucide-react';
import api from '../../../api/axios';

// Master data jurusan siswa — dipilih dari daftar ini saat tambah/ubah
// siswa (bukan ketik bebas), pola sama SubjectsTab (kode + nama).
export default function JurusanTab() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ kode: '', nama: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const listUrut = useMemo(
    () => [...list].sort((a, b) => (a.kode || '').localeCompare(b.kode || '')),
    [list]
  );

  const load = () => api.get('/jurusan').then((res) => setList(res.data));
  useEffect(() => { load(); }, []);

  const handleTambah = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/jurusan', form);
      setForm({ kode: '', nama: '' });
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah jurusan.');
    } finally {
      setLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm({ kode: '', nama: '' });
    setError('');
  };

  const startEdit = (item) => { setEditId(item.id); setEditForm({ kode: item.kode || '', nama: item.nama }); setError(''); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const handleSimpanEdit = async (id) => {
    setError('');
    setLoading(true);
    try {
      await api.put(`/jurusan/${id}`, editForm);
      cancelEdit();
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  const handleHapus = async (item) => {
    if (!confirm(`Hapus jurusan "${item.nama}"?`)) return;
    try {
      await api.delete(`/jurusan/${item.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus jurusan.');
    }
  };

  return (
    <div className="space-y-6">
      {showForm && (
        <form onSubmit={handleTambah} className="surface-card p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-900 flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> Tambah Jurusan</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <input placeholder="Kode (mis. TKJ)" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="field-input sm:w-40" required />
            <input placeholder="Nama jurusan, mis. Teknik Komputer & Jaringan" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input sm:flex-1" required />
            <div className="flex gap-2">
              <button disabled={loading} className="btn-primary whitespace-nowrap justify-center"><Plus className="w-4 h-4" /> {loading ? '...' : 'Tambah'}</button>
              <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" /> Jurusan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h2>
          {!showForm && (
            <button onClick={() => { setForm({ kode: '', nama: '' }); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Jurusan
            </button>
          )}
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Daftar jurusan yang bisa dipilih saat menambah/mengubah data siswa (menu Master Data &gt; Siswa) — supaya kode &amp; nama jurusan tetap konsisten, tidak diketik bebas.
        </p>
        {error && !showForm && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium w-32 whitespace-nowrap px-2">Kode</th>
              <th className="font-medium whitespace-nowrap px-2">Nama</th>
              <th className="w-24 whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {listUrut.map((item) => (
              <tr key={item.id} className="border-t border-line-200">
                <td className="py-2.5 whitespace-nowrap px-2">
                  {editId === item.id ? (
                    <input value={editForm.kode} onChange={(e) => setEditForm({ ...editForm, kode: e.target.value })} className="field-input py-1" />
                  ) : (
                    <span className="font-mono text-ink-700">{item.kode || '-'}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-2">
                  {editId === item.id ? (
                    <input value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="field-input py-1" />
                  ) : (
                    <span className="text-ink-900">{item.nama}</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  {editId === item.id ? (
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => handleSimpanEdit(item.id)} disabled={loading} className="text-brand-600 hover:text-brand-800" title="Simpan"><Save className="w-4 h-4" /></button>
                      <button onClick={cancelEdit} className="text-ink-300 hover:text-ink-500 text-xs px-1">Batal</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(item)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                      <button onClick={() => handleHapus(item)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="3" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada data jurusan.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
