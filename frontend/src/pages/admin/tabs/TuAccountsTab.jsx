import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../api/axios';

export default function TuAccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAccounts = () => api.get('/tu').then((res) => setAccounts(res.data));
  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tu', form);
      setForm({ name: '', email: '', password: '' });
      loadAccounts();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menambah akun TU.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus akun TU "${name}"?`)) return;
    await api.delete(`/tu/${id}`);
    loadAccounts();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Akun TU Baru</h2>
        <p className="text-xs text-ink-500 mb-4">
          Akun TU (Tata Usaha) dipakai untuk kelola menu SPP siswa — input nominal dan tandai status pembayaran.
        </p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input col-span-2" required autoComplete="new-password" />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun TU'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Akun TU <span className="text-ink-500 font-sans font-normal text-sm">({accounts.length})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th>
              <th className="font-medium">Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{a.name}</td>
                <td className="text-ink-700">{a.email}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(a.id, a.name)} className="text-ink-300 hover:text-honey-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada akun TU.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
