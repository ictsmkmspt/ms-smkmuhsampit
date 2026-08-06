import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';

export default function SanksiTab() {
  const [rules, setRules] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [form, setForm] = useState({ nama: '', min_poin: '', max_poin: '', tindakan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRules = () => api.get('/sanksi-rules').then((res) => setRules(res.data));
  const loadSiswa = () => api.get('/sanksi-rules/siswa').then((res) => setSiswa(res.data));
  useEffect(() => { loadRules(); loadSiswa(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/sanksi-rules', form);
      setForm({ nama: '', min_poin: '', max_poin: '', tindakan: '' });
      loadRules(); loadSiswa();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah aturan sanksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Hapus aturan sanksi "${r.nama}"?`)) return;
    await api.delete(`/sanksi-rules/${r.id}`);
    loadRules(); loadSiswa();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Aturan sanksi bertingkat berdasarkan rentang akumulasi poin pelanggaran siswa (tahun ajaran aktif) — dihitung <b>otomatis</b>, tidak perlu diproses manual per siswa.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Aturan Sanksi</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="Nama tahap (mis. Peringatan Lisan)" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <input type="number" min="0" placeholder="Min poin" value={form.min_poin} onChange={(e) => setForm({ ...form, min_poin: e.target.value })} className="field-input" required />
          <input type="number" min="0" placeholder="Maks poin (kosong = tak terbatas)" value={form.max_poin} onChange={(e) => setForm({ ...form, max_poin: e.target.value })} className="field-input" />
          <textarea placeholder="Tindakan yang dilakukan" value={form.tindakan} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} className="field-input col-span-4" rows={2} required />
        </div>
        <button disabled={loading} className="btn-primary">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Aturan'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Aturan Sanksi <span className="text-ink-500 font-sans font-normal text-sm">({rules.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Tahap</th>
              <th className="font-medium whitespace-nowrap px-2">Rentang Poin</th>
              <th className="font-medium whitespace-nowrap px-2">Tindakan</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900 font-medium whitespace-nowrap px-2">{r.nama}</td>
                <td className="text-ink-700 font-mono whitespace-nowrap px-2">{r.min_poin} – {r.max_poin ?? '∞'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{r.tindakan}</td>
                <td className="text-right whitespace-nowrap px-2"><button onClick={() => handleDelete(r)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {rules.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada aturan sanksi.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Siswa Terkena Sanksi Saat Ini <span className="text-ink-500 font-sans font-normal text-sm">({siswa.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Siswa</th>
              <th className="font-medium whitespace-nowrap px-2">Kelas</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Total Poin</th>
              <th className="font-medium whitespace-nowrap px-2">Tahap Sanksi</th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((row) => (
              <tr key={row.student.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{row.student.user?.name}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{row.student.class_room?.name || '-'}</td>
                <td className="text-center whitespace-nowrap px-2"><span className="badge-soft badge-honey">{row.student.total_poin} poin</span></td>
                <td className="text-ink-700 whitespace-nowrap px-2">{row.sanksi ? row.sanksi.nama : <span className="text-ink-300">Belum ada aturan yang cocok</span>}</td>
              </tr>
            ))}
            {siswa.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada siswa dengan poin pelanggaran saat ini.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
