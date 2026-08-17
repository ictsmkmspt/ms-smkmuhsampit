import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound, Save } from 'lucide-react';
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
  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadAccounts = () => api.get('/tu').then((res) => setAccounts(res.data));
  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tu', form);
      setForm({ name: '', email: '' });
      setShowForm(false);
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

  const batalForm = () => {
    setShowForm(false);
    setForm({ name: '', email: '' });
    setError('');
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setEditData({ name: a.name || '', email: a.email || '' });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/tu/${id}`, editData);
      setEditId(null);
      loadAccounts();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      alert(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400">
          <p className="text-sm text-ink-700">Data Akun TU hanya bisa dilihat di sini — perubahan akun TU dikelola oleh Admin.</p>
        </div>
      )}

      {isAdmin && showForm && (
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
        <div className="flex gap-2 mt-4">
          <button disabled={loading} className="btn-primary">
            <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun TU'}
          </button>
          <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
        </div>
      </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Akun TU <span className="text-ink-500 font-sans font-normal text-sm">({accounts.length})</span>
          </h2>
          {isAdmin && !showForm && (
            <button onClick={() => { setForm({ name: '', email: '' }); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Akun TU
            </button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Email</th>
              {isAdmin && <th className="whitespace-nowrap px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              editId === a.id ? (
                <tr key={a.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="3" className="py-3 whitespace-nowrap px-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama" />
                      <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Email" type="email" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(a.id)} disabled={saving} className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={a.name} /></td>
                  <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={a.email} /></td>
                  {isAdmin && (
                    <td className="text-right whitespace-nowrap px-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(a)} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1">
                          Edit
                        </button>
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
              )
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada akun TU.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
