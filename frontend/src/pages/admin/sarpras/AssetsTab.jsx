import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

const KONDISI_LABEL = { baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat' };
const KONDISI_BADGE = { baik: 'badge-brand', rusak_ringan: 'badge-honey', rusak_berat: 'badge-soft' };

export default function AssetsTab() {
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ kode_aset: '', nama: '', kategori: '', kondisi: 'baik', jumlah: 1, room_id: '', tanggal_perolehan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/assets').then((res) => setAssets(res.data));
  useEffect(() => { load(); api.get('/rooms').then((res) => setRooms(res.data)); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/assets', { ...form, room_id: form.room_id || null });
      setForm({ kode_aset: '', nama: '', kategori: '', kondisi: 'baik', jumlah: 1, room_id: '', tanggal_perolehan: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah aset.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus aset "${a.nama}"?`)) return;
    try {
      await api.delete(`/assets/${a.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Aset</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="Kode aset" value={form.kode_aset} onChange={(e) => setForm({ ...form, kode_aset: e.target.value })} className="field-input" required />
          <input placeholder="Nama aset" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <input placeholder="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="field-input" />
          <select value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })} className="field-input text-ink-700">
            {Object.entries(KONDISI_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input type="number" min="1" placeholder="Jumlah" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} className="field-input" required />
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="field-input text-ink-700">
            <option value="">Tanpa ruang</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
          <input type="date" value={form.tanggal_perolehan} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} className="field-input" />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Aset'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Aset <span className="text-ink-500 font-sans font-normal text-sm">({assets.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Kode</th>
              <th className="font-medium">Nama</th>
              <th className="font-medium">Ruang</th>
              <th className="font-medium text-center">Jumlah</th>
              <th className="font-medium text-center">Kondisi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500">{a.kode_aset}</td>
                <td className="text-ink-900">{a.nama}</td>
                <td className="text-ink-700">{a.room?.nama || '-'}</td>
                <td className="text-center text-ink-700">{a.jumlah}</td>
                <td className="text-center"><span className={`badge-soft ${KONDISI_BADGE[a.kondisi]}`}>{KONDISI_LABEL[a.kondisi]}</span></td>
                <td className="text-right"><button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {assets.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-ink-300">Belum ada data aset.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
