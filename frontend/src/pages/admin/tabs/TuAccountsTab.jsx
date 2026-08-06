import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { useAuth } from '../../../context/AuthContext';

export default function TuAccountsTab() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });
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
      setForm({ name: '', email: '' });
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

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password akun TU "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/tu/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Data Akun TU hanya bisa dilihat di sini — perubahan akun TU dikelola oleh Admin.</p>
        </div>
      )}

      {isAdmin && (
      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Akun TU Baru</h2>
        <p className="text-xs text-ink-500 mb-4">
          Akun TU (Tata Usaha) dipakai untuk kelola menu SPP siswa — input nominal dan tandai status pembayaran. Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.
        </p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" required autoComplete="off" />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun TU'}
        </button>
      </form>
      )}

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Akun TU <span className="text-ink-500 font-sans font-normal text-sm">({accounts.length})</span>
        </h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th>
              <th className="font-medium">Email</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900"><TruncateText text={a.name} /></td>
                <td className="text-ink-700"><TruncateText text={a.email} /></td>
                {isAdmin && (
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleResetPassword(a.id, a.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a.id, a.name)} className="text-ink-300 hover:text-honey-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada akun TU.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
