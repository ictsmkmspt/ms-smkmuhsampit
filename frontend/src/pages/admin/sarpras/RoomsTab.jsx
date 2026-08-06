import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

const JENIS_LABEL = { kelas: 'Ruang Kelas', lab: 'Laboratorium', bengkel: 'Bengkel', kantor: 'Kantor', lainnya: 'Lainnya' };

export default function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ nama: '', jenis: 'kelas', kapasitas: '', teacher_id: '', keterangan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/rooms').then((res) => setRooms(res.data));
  useEffect(() => {
    load();
    api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/rooms', { ...form, teacher_id: form.teacher_id || null });
      setForm({ nama: '', jenis: 'kelas', kapasitas: '', teacher_id: '', keterangan: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah ruang.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Hapus ruang "${r.nama}"?`)) return;
    try {
      await api.delete(`/rooms/${r.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Ruang / Lab / Bengkel</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="Nama ruang" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="field-input text-ink-700">
            {Object.entries(JENIS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input type="number" min="0" placeholder="Kapasitas" value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: e.target.value })} className="field-input" />
          <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="field-input col-span-2 text-ink-700">
            <option value="">— Penanggung jawab (guru) —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
          </select>
          <input placeholder="Keterangan" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="field-input col-span-2" />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Ruang'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Ruang <span className="text-ink-500 font-sans font-normal text-sm">({rooms.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th>
              <th className="font-medium">Jenis</th>
              <th className="font-medium text-center">Kapasitas</th>
              <th className="font-medium">Penanggung Jawab</th>
              <th className="font-medium text-center">Jml Aset</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{r.nama}</td>
                <td><span className="badge-soft badge-brand">{JENIS_LABEL[r.jenis]}</span></td>
                <td className="text-center text-ink-700">{r.kapasitas ?? '-'}</td>
                <td className="text-ink-700">{r.teacher?.user?.name || '-'}</td>
                <td className="text-center text-ink-700">{r.assets_count}</td>
                <td className="text-right"><button onClick={() => handleDelete(r)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {rooms.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-ink-300">Belum ada data ruang.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
