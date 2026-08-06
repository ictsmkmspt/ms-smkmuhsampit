import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { useAuth } from '../../../context/AuthContext';

const ROLE_LABEL = {
  admin: 'Super Admin',
  waka: 'Admin',
  waka_kesiswaan: 'Waka Kesiswaan',
  waka_kurikulum: 'Waka Kurikulum',
  waka_humas: 'Waka Humas',
  waka_sarpras: 'Waka Sarpras',
};

export default function AdminAccountsTab() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'waka_kesiswaan' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAccounts = () => api.get('/admin-accounts').then((res) => setAccounts(res.data));
  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/admin-accounts', form);
      setForm({ name: '', email: '', role: 'waka_kesiswaan' });
      loadAccounts();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah akun.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus akun "${a.name}" (${ROLE_LABEL[a.role]})?`)) return;
    try {
      await api.delete(`/admin-accounts/${a.id}`);
      loadAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus akun.');
    }
  };

  const handleResetPassword = async (a) => {
    if (!confirm(`Reset password akun "${a.name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/admin-accounts/${a.id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Akun Admin</h2>
        <p className="text-xs text-ink-500 mb-4">
          <b>Super Admin</b> punya akses penuh ke semua menu. Tiap <b>Waka</b> hanya melihat & mengelola menu sesuai bidangnya sendiri — Kesiswaan (Kelas/Siswa/Wali/Poin/BK/Sanksi), Kurikulum (Guru/Mapel/Jadwal/Kalender Akademik), Humas (IDUKA/PKL/PPDB), atau Sarpras (Ruang/Aset/Pemeliharaan/Pengadaan). Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.
        </p>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="field-input text-ink-700">
            <option value="waka_kesiswaan">Waka Kesiswaan</option>
            <option value="waka_kurikulum">Waka Kurikulum</option>
            <option value="waka_humas">Waka Humas</option>
            <option value="waka_sarpras">Waka Sarpras</option>
            <option value="admin">Super Admin</option>
          </select>
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input col-span-2" required autoComplete="off" />
        </div>
        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar Akun Admin <span className="text-ink-500 font-sans font-normal text-sm">({accounts.length})</span>
        </h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Email</th>
              <th className="font-medium whitespace-nowrap px-2">Peran</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">
                  <TruncateText text={a.name} />
                  {a.id === user.id && <span className="ml-1.5 text-xs text-ink-400">(Anda)</span>}
                </td>
                <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={a.email} /></td>
                <td className="whitespace-nowrap px-2">
                  <span className={`badge-soft ${a.role === 'admin' ? 'badge-brand' : 'badge-soft'}`}>
                    {ROLE_LABEL[a.role] || a.role}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  {a.id !== user.id && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleResetPassword(a)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada akun admin.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
