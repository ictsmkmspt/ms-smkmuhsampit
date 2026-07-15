import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import api from '../../../api/axios';

export default function KalenderLiburTab() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ date: '', keterangan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadHolidays = () => api.get('/holidays').then((res) => setHolidays(res.data));
  useEffect(() => { loadHolidays(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/holidays', form);
      setForm({ date: '', keterangan: '' });
      loadHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambah hari libur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, keterangan) => {
    if (!confirm(`Hapus hari libur "${keterangan}"?`)) return;
    await api.delete(`/holidays/${id}`);
    loadHolidays();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="surface-card p-5 border-l-4 border-l-brand-400">
        <div className="flex gap-2">
          <CalendarDays className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700">
            Sabtu & Minggu <b>otomatis</b> dianggap libur, tidak perlu ditambahkan manual. Halaman ini khusus untuk hari libur lain (libur nasional, cuti bersama, libur sekolah). Siswa tidak akan ditandai alpa pada tanggal yang tercatat di sini.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Hari Libur</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="flex gap-3">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="field-input"
            required
          />
          <input
            placeholder="Keterangan (misal: Hari Kemerdekaan)"
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            className="field-input flex-1"
            required
          />
          <button disabled={loading} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Hari Libur <span className="text-ink-500 font-sans font-normal text-sm">({holidays.length})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Tanggal</th>
              <th className="font-medium">Keterangan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-900">{h.date}</td>
                <td className="text-ink-700">{h.keterangan}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(h.id, h.keterangan)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada hari libur yang ditambahkan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
