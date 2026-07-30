import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Building2 } from 'lucide-react';
import api from '../../../../api/axios';

const emptyForm = {
  name: '', email: '', password: '',
  nama_perusahaan: '', alamat: '', penanggung_jawab: '', telepon: '',
};

export default function DudiTab() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/dudi').then((res) => setList(res.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Nama akun login dipakai dari "Nama Instruktur" — tidak perlu diketik terpisah lagi.
      await api.post('/dudi', { ...form, name: form.penanggung_jawab });
      setForm(emptyForm);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah DUDI.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditData({
      nama_perusahaan: d.nama_perusahaan,
      alamat: d.alamat || '',
      penanggung_jawab: d.penanggung_jawab || '',
      telepon: d.telepon || '',
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/dudi/${id}`, editData);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Hapus akun DUDI "${d.nama_perusahaan}"? Penempatan PKL yang terhubung ke DUDI ini juga akan terhapus.`)) return;
    try {
      await api.delete(`/dudi/${d.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Building2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          DUDI = Dunia Usaha/Dunia Industri, yaitu perusahaan/instansi tempat siswa PKL. Setiap DUDI punya akun login sendiri untuk memantau kehadiran dan memverifikasi absensi siswa bimbingannya.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Akun DUDI</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <p className="text-xs font-medium text-ink-500 mb-2">Akun login</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input placeholder="Email login" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input col-span-2" required autoComplete="off" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input col-span-2" required autoComplete="new-password" />
        </div>

        <p className="text-xs font-medium text-ink-500 mb-2">Profil perusahaan</p>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Nama perusahaan/instansi" value={form.nama_perusahaan} onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })} className="field-input col-span-2" required />
          <input placeholder="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input col-span-2" />
          <input placeholder="Nama Instruktur" value={form.penanggung_jawab} onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })} className="field-input" required />
          <input placeholder="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} className="field-input" />
        </div>

        <button disabled={loading} className="btn-primary mt-4">
          <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah DUDI'}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Daftar DUDI <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Perusahaan</th>
              <th className="font-medium">Kontak</th>
              <th className="pb-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              editId === d.id ? (
                <tr key={d.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="3" className="py-3">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.nama_perusahaan} onChange={(e) => setEditData({ ...editData, nama_perusahaan: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama perusahaan" />
                      <input value={editData.penanggung_jawab} onChange={(e) => setEditData({ ...editData, penanggung_jawab: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama Instruktur" />
                      <input value={editData.alamat} onChange={(e) => setEditData({ ...editData, alamat: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Alamat" />
                      <input value={editData.telepon} onChange={(e) => setEditData({ ...editData, telepon: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Telepon" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(d.id)} disabled={saving} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                        {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={d.id} className="border-t border-line-200">
                  <td className="py-2.5">
                    <p className="text-ink-900 font-medium">{d.nama_perusahaan}</p>
                    <p className="text-xs text-ink-500">{d.alamat || '-'}</p>
                  </td>
                  <td className="text-ink-700">
                    <p>{d.penanggung_jawab || '-'}</p>
                    <p className="text-xs text-ink-500">{d.telepon || '-'}</p>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(d)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(d)} className="text-ink-300 hover:text-honey-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {list.length === 0 && (
              <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada DUDI yang terdaftar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
