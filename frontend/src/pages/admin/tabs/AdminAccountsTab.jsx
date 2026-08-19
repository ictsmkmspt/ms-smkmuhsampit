import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, KeyRound, Save } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { useAuth } from '../../../context/AuthContext';
import { namaKeEmailSekolah } from '../../../utils/email';

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
  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Email auto-terisi dari Nama (nama disambung tanpa spasi + domain sekolah)
  // selama pengguna belum mengetik sendiri di kolom Email — begitu diketik
  // manual, auto-isi berhenti supaya tidak menimpa email yang sudah disunting.
  const emailManual = useRef(false);

  const loadAccounts = () => api.get('/admin-accounts').then((res) => setAccounts(res.data));
  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/admin-accounts', form);
      setForm({ name: '', email: '', role: 'waka_kesiswaan' });
      emailManual.current = false;
      setShowForm(false);
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

  const batalForm = () => {
    setShowForm(false);
    setForm({ name: '', email: '', role: 'waka_kesiswaan' });
    emailManual.current = false;
    setError('');
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setEditData({ name: a.name || '', email: a.email || '', role: a.role });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/admin-accounts/${id}`, editData);
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
      {showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Akun Admin</h2>
          <p className="text-xs text-ink-500 mb-4">
            <b>Super Admin</b> punya akses penuh ke semua menu. Tiap <b>Waka</b> hanya melihat & mengelola menu sesuai bidangnya sendiri — Kesiswaan (Kelas/Siswa/Wali/Poin/BK/Sanksi), Kurikulum (Guru/Mapel/Jadwal/Kalender Akademik), Humas (IDUKA/PKL/PPDB), atau Sarpras (Ruang/Aset/Pemeliharaan/Pengadaan). Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.
          </p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nama" value={form.name} onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, email: emailManual.current ? f.email : namaKeEmailSekolah(name) }));
            }} className="field-input" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="field-input text-ink-700">
              <option value="waka_kesiswaan">Waka Kesiswaan</option>
              <option value="waka_kurikulum">Waka Kurikulum</option>
              <option value="waka_humas">Waka Humas</option>
              <option value="waka_sarpras">Waka Sarpras</option>
              <option value="admin">Super Admin</option>
            </select>
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => { emailManual.current = true; setForm({ ...form, email: e.target.value }); }} className="field-input col-span-2" required autoComplete="off" />
          </div>
          <div className="flex gap-2 mt-4">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Akun'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Akun Admin <span className="text-ink-500 font-sans font-normal text-sm">({accounts.length})</span>
          </h2>
          {!showForm && (
            <button onClick={() => { setForm({ name: '', email: '', role: 'waka_kesiswaan' }); emailManual.current = false; setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Akun Admin
            </button>
          )}
        </div>
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
              editId === a.id ? (
                <tr key={a.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="4" className="py-3 whitespace-nowrap px-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama" />
                      <select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                        <option value="waka_kesiswaan">Waka Kesiswaan</option>
                        <option value="waka_kurikulum">Waka Kurikulum</option>
                        <option value="waka_humas">Waka Humas</option>
                        <option value="waka_sarpras">Waka Sarpras</option>
                        <option value="admin">Super Admin</option>
                      </select>
                      <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Email" type="email" />
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
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(a)} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1">
                        Edit
                      </button>
                      {a.id !== user.id && (
                        <>
                          <button onClick={() => handleResetPassword(a)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
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
