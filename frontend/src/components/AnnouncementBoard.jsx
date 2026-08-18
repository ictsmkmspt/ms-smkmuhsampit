import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { fmtDMY } from '../utils/date';
import Pagination from './Pagination';
import usePagination from '../hooks/usePagination';

const KOSONG = { judul: '', isi: '' };

/**
 * Papan Pengumuman — dipakai bersama di Beranda Guru (bisa kelola),
 * Beranda Siswa, dan Beranda Wali/Ortu (baca-saja). `canManage` cuma
 * mengatur apakah tombol "Tambah Pengumuman" ditampilkan; backend tetap
 * jadi penjaga utama (POST/PUT/DELETE dikunci role:guru + kepemilikan
 * dibuat_oleh, lihat AnnouncementController).
 *
 * Foto opsional — otomatis dihapus dari server 30 hari setelah dibuat
 * (lihat CleanupAnnouncementPhotos), teks pengumumannya tetap ada.
 */
export default function AnnouncementBoard({ canManage = false }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [fotoFile, setFotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(KOSONG);
  const [editFotoFile, setEditFotoFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const { page, setPage, totalPages, paginated: itemsHalaman } = usePagination(items, 1);

  const load = () => {
    setLoading(true);
    api.get('/announcements').then((res) => setItems(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setShowForm(false);
    setForm(KOSONG);
    setFotoFile(null);
    setError('');
  };

  const handleTambah = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const data = new FormData();
      data.append('judul', form.judul);
      data.append('isi', form.isi);
      if (fotoFile) data.append('foto', fotoFile);
      await api.post('/announcements', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      resetForm();
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah pengumuman.');
    } finally {
      setSaving(false);
    }
  };

  const bukaEdit = (a) => {
    setEditingId(a.id);
    setEditForm({ judul: a.judul, isi: a.isi });
    setEditFotoFile(null);
  };

  const simpanEdit = async (id) => {
    setEditSaving(true);
    try {
      await api.put(`/announcements/${id}`, editForm);
      if (editFotoFile) {
        const data = new FormData();
        data.append('foto', editFotoFile);
        await api.post(`/announcements/${id}/foto`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setEditingId(null);
      setEditFotoFile(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const hapus = async (a) => {
    if (!confirm(`Hapus pengumuman "${a.judul}"?`)) return;
    try {
      await api.delete(`/announcements/${a.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-ink-500" /> Papan Pengumuman
        </h2>
        {canManage && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tambah Pengumuman
          </button>
        )}
      </div>

      {canManage && showForm && (
        <form onSubmit={handleTambah} className="bg-mist-50 border border-line-200 rounded-xl p-3 mb-4 space-y-2">
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          <input
            placeholder="Judul pengumuman"
            value={form.judul}
            onChange={(e) => setForm({ ...form, judul: e.target.value })}
            className="field-input text-sm"
            required
          />
          <textarea
            placeholder="Isi pengumuman"
            value={form.isi}
            onChange={(e) => setForm({ ...form, isi: e.target.value })}
            className="field-input text-sm w-full"
            rows={3}
            required
          />
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1">
              <ImageIcon className="w-3.5 h-3.5" /> Foto (opsional, maks 2MB, otomatis terhapus setelah 30 hari)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFotoFile(e.target.files[0] || null)}
              className="field-input text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button disabled={saving} className="btn-primary text-sm">
              {saving ? 'Menyimpan...' : 'Terbitkan'}
            </button>
            <button type="button" onClick={resetForm} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-3">
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-ink-300 py-6 text-sm">Belum ada pengumuman.</p>
      ) : (
        <div className="space-y-3">
          {itemsHalaman.map((a) => {
            const milikSendiri = canManage && a.dibuat_oleh?.id === user.id;
            return editingId === a.id ? (
              <div key={a.id} className="border border-brand-200 bg-brand-50/40 rounded-xl p-3 space-y-2">
                <input
                  value={editForm.judul}
                  onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                  className="field-input text-sm"
                  required
                />
                <textarea
                  value={editForm.isi}
                  onChange={(e) => setEditForm({ ...editForm, isi: e.target.value })}
                  className="field-input text-sm w-full"
                  rows={3}
                  required
                />
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1">
                    <ImageIcon className="w-3.5 h-3.5" /> {a.foto_url ? 'Ganti foto' : 'Tambah foto'} (opsional, maks 2MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditFotoFile(e.target.files[0] || null)}
                    className="field-input text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button disabled={editSaving} onClick={() => simpanEdit(a.id)} className="btn-primary text-sm">
                    {editSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button onClick={() => { setEditingId(null); setEditFotoFile(null); }} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-3">
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div key={a.id} className="border border-line-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold text-ink-900">{a.judul}</h3>
                  {milikSendiri && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => bukaEdit(a)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                      <button onClick={() => hapus(a)} title="Hapus" className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-ink-700 mt-1 whitespace-pre-wrap">{a.isi}</p>
                {a.foto_url && (
                  <img src={a.foto_url} alt={a.judul} className="mt-2 rounded-lg max-h-64 w-auto object-contain border border-line-200" />
                )}
                <p className="text-xs text-ink-400 mt-2">
                  {a.dibuat_oleh?.name || 'Guru'} &middot; {fmtDMY(a.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
