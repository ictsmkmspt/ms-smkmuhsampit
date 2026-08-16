import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { fmtDMY } from '../../../utils/date';

const STATUS_LABEL = { diajukan: 'Diajukan', disetujui: 'Disetujui', ditolak: 'Ditolak', dibeli: 'Dibeli' };
const STATUS_BADGE = { diajukan: 'badge-soft', disetujui: 'badge-honey', ditolak: 'badge-soft', dibeli: 'badge-brand' };

export default function ProcurementsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nama_barang: '', jumlah: 1, alasan: '', tanggal_pengajuan: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const { page, setPage, totalPages, paginated: itemsHalaman } = usePagination(items, 30);

  const load = () => api.get('/procurements').then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/procurements', form);
      setForm({ nama_barang: '', jumlah: 1, alasan: '', tanggal_pengajuan: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengajukan pengadaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (p, status) => {
    setSavingId(p.id);
    try {
      await api.put(`/procurements/${p.id}`, {
        status,
        tanggal_realisasi: status === 'dibeli' ? new Date().toISOString().slice(0, 10) : p.tanggal_realisasi,
        keterangan: p.keterangan || '',
      });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus pengajuan "${p.nama_barang}"?`)) return;
    await api.delete(`/procurements/${p.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Ajukan Pengadaan Barang</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="Nama barang" value={form.nama_barang} onChange={(e) => setForm({ ...form, nama_barang: e.target.value })} className="field-input col-span-2" required />
          <input type="number" min="1" placeholder="Jumlah" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} className="field-input" required />
          <DateInput value={form.tanggal_pengajuan} onChange={(e) => setForm({ ...form, tanggal_pengajuan: e.target.value })} className="field-input" required />
          <textarea placeholder="Alasan pengajuan" value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} className="field-input col-span-2" rows={2} required />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Ajukan'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Pengajuan <span className="text-ink-500 font-sans font-normal text-sm">({items.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
              <th className="font-medium whitespace-nowrap px-2">Barang</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Jumlah</th>
              <th className="font-medium whitespace-nowrap px-2">Alasan</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {itemsHalaman.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-700 whitespace-nowrap px-2">{fmtDMY(p.tanggal_pengajuan)}</td>
                <td className="text-ink-900 whitespace-nowrap px-2">{p.nama_barang}</td>
                <td className="text-center text-ink-700 whitespace-nowrap px-2">{p.jumlah}</td>
                <td className="text-ink-700 max-w-[16rem] whitespace-nowrap px-2">{p.alasan}</td>
                <td className="text-center whitespace-nowrap px-2">
                  <select
                    value={p.status}
                    disabled={savingId === p.id}
                    onChange={(e) => handleUpdateStatus(p, e.target.value)}
                    className={`badge-soft ${STATUS_BADGE[p.status]} border-0`}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="text-right whitespace-nowrap px-2"><button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada pengajuan pengadaan.</td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
