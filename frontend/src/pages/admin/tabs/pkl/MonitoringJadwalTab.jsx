import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, CalendarClock } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import DateInput from '../../../../components/DateInput';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';
import { fmtDMY } from '../../../../utils/date';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = { judul: '', tanggal_rencana: hariIniIso(), tanggal_selesai: '', catatan: '' };

/**
 * Jadwal Monitoring PKL — GLOBAL, dikelola admin/Waka Kurikulum di sini,
 * langsung tampil ke SEMUA guru (read-only) di menu PKL > Monitoring
 * mereka. Bukan per siswa/per IDUKA — 1 baris = 1 periode monitoring
 * yang berlaku sekolah-wide.
 */
export default function MonitoringJadwalTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const load = () => api.get('/pkl-monitoring-jadwal').then((res) => setList(res.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/pkl-monitoring-jadwal', { ...form, tanggal_selesai: form.tanggal_selesai || null });
      setForm(emptyForm);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah jadwal monitoring.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (j) => {
    setEditId(j.id);
    setEditData({ judul: j.judul, tanggal_rencana: j.tanggal_rencana, tanggal_selesai: j.tanggal_selesai || '', catatan: j.catatan || '' });
  };

  const handleSaveEdit = async (id) => {
    setEditSaving(true);
    try {
      await api.put(`/pkl-monitoring-jadwal/${id}`, { ...editData, tanggal_selesai: editData.tanggal_selesai || null });
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (j) => {
    if (!confirm(`Hapus jadwal monitoring "${j.judul}"? Semua guru tidak akan melihatnya lagi.`)) return;
    await api.delete(`/pkl-monitoring-jadwal/${j.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <CalendarClock className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Jadwal monitoring di sini berlaku untuk SEMUA guru pembimbing PKL sekaligus (bukan per siswa/per IDUKA) — langsung tampil di menu PKL &gt; Monitoring milik tiap guru begitu ditambahkan.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Jadwal Monitoring</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input placeholder="Judul (mis. Monitoring PKL Tahap 1)" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="field-input sm:col-span-2" required />
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Mulai</label>
            <DateInput value={form.tanggal_rencana} onChange={(e) => setForm({ ...form, tanggal_rencana: e.target.value })} className="field-input" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Selesai (opsional)</label>
            <DateInput value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="field-input" />
          </div>
          <input placeholder="Catatan (opsional)" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="field-input sm:col-span-2" />
        </div>
        <button disabled={saving} className="btn-primary">
          <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Tambah Jadwal'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Jadwal Monitoring <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Judul</th>
                  <th className="font-medium whitespace-nowrap px-2">Periode</th>
                  <th className="font-medium whitespace-nowrap px-2">Catatan</th>
                  <th className="font-medium whitespace-nowrap px-2">Dibuat Oleh</th>
                  <th className="pb-2 w-20 whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {listHalaman.map((j) => (
                  editId === j.id ? (
                    <tr key={j.id} className="border-t border-line-200 bg-mist-50">
                      <td colSpan="5" className="py-3 whitespace-nowrap px-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          <input value={editData.judul} onChange={(e) => setEditData({ ...editData, judul: e.target.value })} className="field-input py-1.5 text-sm sm:col-span-2" placeholder="Judul" />
                          <DateInput value={editData.tanggal_rencana} onChange={(e) => setEditData({ ...editData, tanggal_rencana: e.target.value })} className="field-input py-1.5 text-sm" />
                          <DateInput value={editData.tanggal_selesai} onChange={(e) => setEditData({ ...editData, tanggal_selesai: e.target.value })} className="field-input py-1.5 text-sm" />
                          <input value={editData.catatan} onChange={(e) => setEditData({ ...editData, catatan: e.target.value })} className="field-input py-1.5 text-sm sm:col-span-2" placeholder="Catatan" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(j.id)} disabled={editSaving} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                            {editSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={j.id} className="border-t border-line-200">
                      <td className="py-2.5 whitespace-nowrap px-2 text-ink-900 font-medium"><TruncateText text={j.judul} /></td>
                      <td className="text-ink-700 text-xs whitespace-nowrap px-2">
                        {fmtDMY(j.tanggal_rencana)}{j.tanggal_selesai && j.tanggal_selesai !== j.tanggal_rencana ? ` s/d ${fmtDMY(j.tanggal_selesai)}` : ''}
                      </td>
                      <td className="text-ink-500 whitespace-nowrap px-2"><TruncateText text={j.catatan || '-'} maxWidth="12rem" /></td>
                      <td className="text-ink-500 whitespace-nowrap px-2">{j.dibuat_oleh?.name || '-'}</td>
                      <td className="text-right whitespace-nowrap px-2">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(j)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(j)} className="text-ink-300 hover:text-honey-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada jadwal monitoring.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}
