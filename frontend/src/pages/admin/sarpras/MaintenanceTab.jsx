import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

const STATUS_LABEL = { dilaporkan: 'Dilaporkan', diproses: 'Diproses', selesai: 'Selesai' };
const STATUS_BADGE = { dilaporkan: 'badge-soft', diproses: 'badge-honey', selesai: 'badge-brand' };

export default function MaintenanceTab() {
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ asset_id: '', room_id: '', deskripsi: '', pelapor: '', tanggal_lapor: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = () => api.get('/maintenance-requests').then((res) => setRequests(res.data));
  useEffect(() => {
    load();
    api.get('/assets').then((res) => setAssets(res.data));
    api.get('/rooms').then((res) => setRooms(res.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/maintenance-requests', { ...form, asset_id: form.asset_id || null, room_id: form.room_id || null });
      setForm({ asset_id: '', room_id: '', deskripsi: '', pelapor: '', tanggal_lapor: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal melapor kerusakan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (r, status) => {
    setSavingId(r.id);
    try {
      await api.put(`/maintenance-requests/${r.id}`, {
        status,
        tanggal_selesai: status === 'selesai' ? new Date().toISOString().slice(0, 10) : r.tanggal_selesai,
        catatan_penyelesaian: r.catatan_penyelesaian || '',
      });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (r) => {
    if (!confirm('Hapus laporan pemeliharaan ini?')) return;
    await api.delete(`/maintenance-requests/${r.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Lapor Kerusakan / Pemeliharaan</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <select value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} className="field-input text-ink-700">
            <option value="">Tanpa aset spesifik</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
          </select>
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="field-input text-ink-700">
            <option value="">Tanpa ruang spesifik</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
          <input type="date" value={form.tanggal_lapor} onChange={(e) => setForm({ ...form, tanggal_lapor: e.target.value })} className="field-input" required />
          <input placeholder="Pelapor" value={form.pelapor} onChange={(e) => setForm({ ...form, pelapor: e.target.value })} className="field-input" />
          <textarea placeholder="Deskripsi kerusakan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className="field-input col-span-2" rows={2} required />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Lapor'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Laporan <span className="text-ink-500 font-sans font-normal text-sm">({requests.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Tanggal Lapor</th>
              <th className="font-medium">Aset / Ruang</th>
              <th className="font-medium">Deskripsi</th>
              <th className="font-medium">Pelapor</th>
              <th className="font-medium text-center">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-700">{r.tanggal_lapor}</td>
                <td className="text-ink-700">{r.asset?.nama || r.room?.nama || '-'}</td>
                <td className="text-ink-700 max-w-[16rem]">{r.deskripsi}</td>
                <td className="text-ink-700">{r.pelapor || '-'}</td>
                <td className="text-center">
                  <select
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => handleUpdateStatus(r, e.target.value)}
                    className={`badge-soft ${STATUS_BADGE[r.status]} border-0`}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="text-right"><button onClick={() => handleDelete(r)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-ink-300">Belum ada laporan pemeliharaan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
