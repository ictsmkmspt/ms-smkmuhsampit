import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, KeyRound, X } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { namaKeEmailSekolah } from '../../../utils/email';

const FORM_KOSONG = { name: '', email: '' };

export default function PustakawanTab() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Email auto-terisi dari Nama (nama disambung tanpa spasi + domain sekolah)
  // selama pengguna belum mengetik sendiri di kolom Email — begitu diketik
  // manual, auto-isi berhenti supaya tidak menimpa email yang sudah disunting.
  // Hanya berlaku saat tambah akun baru, bukan saat mengubah akun yang ada.
  const emailManual = useRef(false);

  const load = () => api.get('/pustakawan').then((res) => setStaff(res.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (editId) {
        await api.put(`/pustakawan/${editId}`, { name: form.name, email: form.email });
      } else {
        await api.post('/pustakawan', form);
      }
      setForm(FORM_KOSONG);
      setEditId(null);
      if (!editId) emailManual.current = false;
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan akun.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setForm({ name: s.name, email: s.email });
    setError('');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(FORM_KOSONG);
    emailManual.current = false;
    setError('');
    setShowForm(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus akun "${name}"?`)) return;
    await api.delete(`/pustakawan/${id}`);
    load();
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password akun "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/pustakawan/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">Pengaturan durasi pinjam & kategori buku sekarang dikelola langsung oleh Pengurus Perpustakaan lewat tab "Pengaturan" di dashboard mereka sendiri.</p>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">{editId ? 'Ubah Akun' : 'Tambah Akun Pengurus Perpustakaan'}</h2>
          <p className="text-xs text-ink-500 mb-4">Password otomatis "123456", wajib diganti saat login pertama.</p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nama" value={form.name} onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                email: (!editId && !emailManual.current) ? namaKeEmailSekolah(name) : f.email,
              }));
            }} className="field-input" required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => { emailManual.current = true; setForm({ ...form, email: e.target.value }); }} className="field-input" required autoComplete="off" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Akun'}
            </button>
            <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition">
              <X className="w-4 h-4" /> Batal
            </button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Akun <span className="text-ink-500 font-sans font-normal text-sm">({staff.length})</span>
          </h2>
          {!showForm && (
            <button onClick={() => { setEditId(null); setForm(FORM_KOSONG); emailManual.current = false; setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Akun
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
                <th className="font-medium whitespace-nowrap px-2">Email</th>
                <th className="whitespace-nowrap px-2"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={s.name} /></td>
                  <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={s.email} /></td>
                  <td className="text-right whitespace-nowrap px-2">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                        Edit
                      </button>
                      <button onClick={() => handleResetPassword(s.id, s.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="text-ink-300 hover:text-honey-700" title="Hapus akun">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada akun Pengurus Perpustakaan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
