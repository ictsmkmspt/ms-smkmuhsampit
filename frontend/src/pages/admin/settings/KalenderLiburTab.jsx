import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import api from '../../../api/axios';

export default function KalenderLiburTab() {
  const [holidays, setHolidays] = useState([]);
  const [mode, setMode] = useState('single'); // 'single' | 'range'
  const [form, setForm] = useState({ date: '', keterangan: '' });
  const [rangeForm, setRangeForm] = useState({ date_from: '', date_to: '', keterangan: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadHolidays = () => api.get('/holidays').then((res) => setHolidays(res.data));
  useEffect(() => { loadHolidays(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
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

  const handleAddRange = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/holidays/range', rangeForm);
      setInfo(res.data.message);
      setRangeForm({ date_from: '', date_to: '', keterangan: '' });
      loadHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambah rentang hari libur.');
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

      <div className="surface-card p-5">
        <div className="flex gap-1 bg-mist-50 rounded-lg p-1 w-fit mb-4">
          <button
            type="button"
            onClick={() => { setMode('single'); setError(''); setInfo(''); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              mode === 'single' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Satu Hari
          </button>
          <button
            type="button"
            onClick={() => { setMode('range'); setError(''); setInfo(''); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              mode === 'range' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Rentang Tanggal
          </button>
        </div>

        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {info && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-3">{info}</p>}

        {mode === 'single' ? (
          <form onSubmit={handleAdd}>
            <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Hari Libur</h2>
            <div className="flex flex-wrap gap-3">
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
                className="field-input flex-1 min-w-[180px]"
                required
              />
              <button disabled={loading} className="btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddRange}>
            <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Rentang Hari Libur</h2>
            <p className="text-xs text-ink-500 mb-4">
              Cocok untuk libur panjang (libur semester, cuti bersama). Sabtu/Minggu di dalam rentang otomatis dilewati.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={rangeForm.date_from}
                  onChange={(e) => setRangeForm({ ...rangeForm, date_from: e.target.value })}
                  className="field-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={rangeForm.date_to}
                  onChange={(e) => setRangeForm({ ...rangeForm, date_to: e.target.value })}
                  className="field-input"
                  required
                />
              </div>
              <input
                placeholder="Keterangan (misal: Libur Akhir Semester)"
                value={rangeForm.keterangan}
                onChange={(e) => setRangeForm({ ...rangeForm, keterangan: e.target.value })}
                className="field-input flex-1 min-w-[180px]"
                required
              />
              <button disabled={loading} className="btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Rentang'}
              </button>
            </div>
          </form>
        )}
      </div>

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
