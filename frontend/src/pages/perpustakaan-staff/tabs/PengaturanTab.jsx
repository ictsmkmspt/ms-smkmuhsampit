import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, X, Tag, Warehouse } from 'lucide-react';
import api from '../../../api/axios';

// Kategori & Rak sama-sama master data "nama saja" dengan CRUD identik —
// 1 komponen generik dipakai 2x lewat prop endpoint, bukan diduplikasi.
function MasterDataSection({ title, description, icon: Icon, endpoint, placeholder, labelSatuan }) {
  const [list, setList] = useState([]);
  const [namaBaru, setNamaBaru] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get(endpoint).then((res) => setList(res.data));
  useEffect(() => { load(); }, []);

  const handleTambah = async (e) => {
    e.preventDefault();
    if (!namaBaru.trim()) return;
    setError('');
    setSaving(true);
    try {
      await api.post(endpoint, { nama: namaBaru.trim() });
      setNamaBaru('');
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || `Gagal menambah ${labelSatuan}.`);
    } finally {
      setSaving(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setNamaBaru('');
    setError('');
  };

  const startEdit = (item) => { setEditId(item.id); setEditNama(item.nama); setError(''); };
  const cancelEdit = () => { setEditId(null); setEditNama(''); };

  const handleSimpanEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`${endpoint}/${editId}`, { nama: editNama.trim() });
      cancelEdit();
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async (item) => {
    if (!confirm(`Hapus ${labelSatuan} "${item.nama}"?`)) return;
    try {
      await api.delete(`${endpoint}/${item.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || `Gagal menghapus ${labelSatuan}.`);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-1.5"><Icon className="w-4 h-4" /> {title}</h2>
        {!showForm && (
          <button onClick={() => { setNamaBaru(''); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>
      <p className="text-xs text-ink-500 mb-4">{description}</p>
      {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {showForm && (
        <form onSubmit={handleTambah} className="flex gap-2 mb-4">
          <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder={placeholder} className="field-input flex-1" autoFocus />
          <button disabled={saving} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah</button>
          <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3 shrink-0">Batal</button>
        </form>
      )}

      <ul className="divide-y divide-line-200 border border-line-200 rounded-lg overflow-hidden">
        {list.map((item) => (
          <li key={item.id} className="px-3 py-2 flex items-center gap-2">
            {editId === item.id ? (
              <form onSubmit={handleSimpanEdit} className="flex items-center gap-2 flex-1">
                <input value={editNama} onChange={(e) => setEditNama(e.target.value)} className="field-input text-sm flex-1" autoFocus />
                <button type="submit" disabled={saving} className="text-xs font-medium text-brand-600 hover:underline shrink-0">Simpan</button>
                <button type="button" onClick={cancelEdit} className="text-ink-300 hover:text-ink-600 shrink-0"><X className="w-4 h-4" /></button>
              </form>
            ) : (
              <>
                <span className="text-sm text-ink-900 flex-1">{item.nama}</span>
                <button onClick={() => startEdit(item)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1 shrink-0">Edit</button>
                <button onClick={() => handleHapus(item)} className="text-ink-300 hover:text-rose-700 shrink-0" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-300">Belum ada data.</li>}
      </ul>
    </div>
  );
}

export default function PengaturanTab() {
  const [durasi, setDurasi] = useState('7');
  const [savingDurasi, setSavingDurasi] = useState(false);
  const [durasiSukses, setDurasiSukses] = useState(false);

  useEffect(() => {
    api.get('/perpustakaan-pengaturan').then((res) => setDurasi(String(res.data.perpus_durasi_pinjam_hari)));
  }, []);

  const handleSimpanDurasi = async (e) => {
    e.preventDefault();
    setSavingDurasi(true);
    setDurasiSukses(false);
    try {
      await api.put('/perpustakaan-pengaturan', { perpus_durasi_pinjam_hari: durasi });
      setDurasiSukses(true);
      setTimeout(() => setDurasiSukses(false), 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingDurasi(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSimpanDurasi} className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Durasi Pinjam</h2>
        <p className="text-xs text-ink-500 mb-4">Jumlah hari standar sebelum sebuah peminjaman buku dianggap jatuh tempo, dihitung sejak tanggal pinjam.</p>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-[11px] text-ink-500 mb-1">Durasi (hari)</label>
            <input type="number" min="1" max="90" value={durasi} onChange={(e) => setDurasi(e.target.value)} className="field-input w-32" />
          </div>
          <button disabled={savingDurasi} className="btn-primary"><Save className="w-4 h-4" /> {savingDurasi ? 'Menyimpan...' : 'Simpan'}</button>
          {durasiSukses && <span className="text-sm text-brand-600 font-medium">Tersimpan.</span>}
        </div>
      </form>

      <MasterDataSection
        title="Kategori Buku"
        description="Daftar kategori yang bisa dipilih saat menambah buku — supaya kategori tidak diketik bebas dan tetap konsisten."
        icon={Tag}
        endpoint="/perpustakaan-kategori"
        placeholder="Nama kategori baru..."
        labelSatuan="kategori"
      />

      <MasterDataSection
        title="Rak / Lokasi Buku"
        description="Daftar rak yang bisa dipilih saat menambah buku — supaya lokasi fisik buku tercatat konsisten."
        icon={Warehouse}
        endpoint="/perpustakaan-rak"
        placeholder="Nama/kode rak baru..."
        labelSatuan="rak"
      />
    </div>
  );
}
