import { useEffect, useState } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import api from '../../../../api/axios';

const emptyForm = {
  student_id: '', dudi_id: '', guru_pembimbing_id: '',
  tanggal_mulai: '', tanggal_selesai: '',
};

export default function PenempatanTab() {
  const [list, setList] = useState([]);
  const [students, setStudents] = useState([]);
  const [dudiList, setDudiList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    return api.get('/pkl-placements', { params }).then((res) => setList(res.data));
  };

  useEffect(() => {
    api.get('/students').then((res) => setStudents(res.data));
    api.get('/dudi').then((res) => setDudiList(res.data));
    api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  useEffect(() => { load(); }, [filterStatus]); // eslint-disable-line

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/pkl-placements', form);
      setForm(emptyForm);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal membuat penempatan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUbahStatus = async (p, status) => {
    const label = status === 'selesai' ? 'menandai selesai' : 'mengaktifkan kembali';
    if (!confirm(`Yakin ${label} penempatan PKL "${p.student?.user?.name}"?`)) return;
    try {
      await api.put(`/pkl-placements/${p.id}`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status.');
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus penempatan PKL "${p.student?.user?.name}" di "${p.dudi?.nama_perusahaan}"? Seluruh riwayat absensi PKL-nya juga akan terhapus.`)) return;
    try {
      await api.delete(`/pkl-placements/${p.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <ClipboardList className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Setiap siswa hanya boleh punya 1 penempatan berstatus <b>aktif</b> di satu waktu. Begitu penempatan aktif dibuat, menu PKL otomatis muncul di dashboard siswa (menggantikan QR barcode), guru pembimbing, dan DUDI terkait.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Buat Penempatan PKL</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="field-input text-ink-700 col-span-2" required>
            <option value="">— Pilih Siswa —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.user?.name} · {s.class_room?.name || 'Tanpa kelas'}</option>
            ))}
          </select>
          <select value={form.dudi_id} onChange={(e) => setForm({ ...form, dudi_id: e.target.value })} className="field-input text-ink-700" required>
            <option value="">— Pilih DUDI —</option>
            {dudiList.map((d) => (
              <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>
            ))}
          </select>
          <select value={form.guru_pembimbing_id} onChange={(e) => setForm({ ...form, guru_pembimbing_id: e.target.value })} className="field-input text-ink-700">
            <option value="">— Pilih Guru Pembimbing (opsional) —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.user?.name}</option>
            ))}
          </select>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Mulai</label>
            <input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} className="field-input w-full" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Selesai</label>
            <input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="field-input w-full" required />
          </div>
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Buat Penempatan'}
        </button>
      </form>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Penempatan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h2>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="field-input text-sm text-ink-700 w-40">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Siswa</th>
              <th className="font-medium">DUDI</th>
              <th className="font-medium">Pembimbing</th>
              <th className="font-medium">Periode</th>
              <th className="font-medium">Status</th>
              <th className="pb-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5">
                  <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                  <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                </td>
                <td className="text-ink-700">{p.dudi?.nama_perusahaan}</td>
                <td className="text-ink-700">{p.guru_pembimbing?.user?.name || '-'}</td>
                <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                <td>
                  <button onClick={() => handleUbahStatus(p, p.status === 'aktif' ? 'selesai' : 'aktif')}>
                    <span className={`badge-soft ${p.status === 'aktif' ? 'badge-brand' : 'badge-soft'}`}>
                      {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                    </span>
                  </button>
                </td>
                <td className="text-right">
                  <button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="6" className="py-6 text-center text-ink-300">Belum ada penempatan PKL.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
