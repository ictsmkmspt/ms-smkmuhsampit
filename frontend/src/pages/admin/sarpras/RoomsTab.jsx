import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

const JENIS_LABEL = { kelas: 'Ruang Kelas', lab: 'Laboratorium', bengkel: 'Bengkel', kantor: 'Kantor', tanah: 'Tanah', lainnya: 'Lainnya' };
const FORM_KOSONG = { nama: '', kode_ruangan: '', jenis: 'kelas', kapasitas: '', teacher_id: '', keterangan: '' };

export default function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/rooms').then((res) => setRooms(res.data));
  useEffect(() => {
    load();
    api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  const bukaEdit = (r) => {
    setEditingId(r.id);
    setForm({
      nama: r.nama,
      kode_ruangan: r.kode_ruangan || '',
      jenis: r.jenis,
      kapasitas: r.kapasitas ?? '',
      teacher_id: r.teacher_id || '',
      keterangan: r.keterangan || '',
    });
    setError('');
    setShowForm(true);
  };

  const batalEdit = () => {
    setEditingId(null);
    setForm(FORM_KOSONG);
    setError('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, teacher_id: form.teacher_id || null };
      if (editingId) {
        await api.put(`/rooms/${editingId}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      setEditingId(null);
      setForm(FORM_KOSONG);
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || `Gagal ${editingId ? 'menyimpan perubahan' : 'menambah ruang'}.`);
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
      {showForm && (
      <form onSubmit={handleSubmit} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">{editingId ? 'Edit Prasarana' : 'Tambah Ruang / Lab / Bengkel'}</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="Kode ruangan" value={form.kode_ruangan} onChange={(e) => setForm({ ...form, kode_ruangan: e.target.value })} className="field-input" />
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
        <div className="flex gap-2">
          <button disabled={loading} className="btn-primary">
            {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Ruang'}
          </button>
          <button type="button" onClick={batalEdit} className="text-sm font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-xl px-4 py-2 transition">
            Batal
          </button>
        </div>
      </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Ruang <span className="text-ink-500 font-sans font-normal text-sm">({rooms.length})</span></h2>
          {!showForm && (
            <button onClick={() => { setEditingId(null); setForm(FORM_KOSONG); setError(''); setShowForm(true); }} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Ruang</button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Kode Ruangan</th>
              <th className="font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Jenis</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Kapasitas</th>
              <th className="font-medium whitespace-nowrap px-2">Penanggung Jawab</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Jml Aset</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500 whitespace-nowrap px-2">{r.kode_ruangan || '-'}</td>
                <td className="text-ink-900 whitespace-nowrap px-2">{r.nama}</td>
                <td className="whitespace-nowrap px-2"><span className="badge-soft badge-brand">{JENIS_LABEL[r.jenis]}</span></td>
                <td className="text-center text-ink-700 whitespace-nowrap px-2">{r.kapasitas ?? '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{r.teacher?.user?.name || '-'}</td>
                <td className="text-center text-ink-700 whitespace-nowrap px-2">{r.assets_count}</td>
                <td className="text-right whitespace-nowrap px-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => bukaEdit(r)} title="Edit" className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r)} title="Hapus" className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada data ruang.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
