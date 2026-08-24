import { useEffect, useState } from 'react';
import { Plus, Trash2, Building2, MapPin } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';
import { useAuth } from '../../../../context/AuthContext';

const emptyForm = {
  nama_perusahaan: '', alamat: '', telepon: '',
  latitude: '', longitude: '', radius_meter: '100',
};

/**
 * Kelola IDUKA — data MASTER perusahaan mitra + lokasi/radius GPS (dipakai
 * geofencing absensi PKL). Tidak ada akun login di sini — akun Instruktur
 * (Kelola Instruktur) dibuat terpisah, MEMILIH salah satu perusahaan dari
 * daftar ini.
 */
export default function IdukaTab() {
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'waka_humas';
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [locatingEdit, setLocatingEdit] = useState(false);

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const load = () => api.get('/iduka').then((res) => setList(res.data));
  useEffect(() => { load(); }, []);

  const ambilLokasi = (onDone) => {
    if (!navigator.geolocation) {
      alert('Perangkat/browser ini tidak mendukung fitur lokasi.');
      return;
    }
    onDone.setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onDone.set({ latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) });
        onDone.setLocating(false);
      },
      (err) => {
        alert('Gagal mengambil lokasi: ' + err.message + '\n\nCatatan: fitur lokasi browser hanya jalan di alamat https:// atau localhost. Kalau server ini diakses lewat alamat http:// biasa (IP jaringan), browser akan menolak permintaan lokasi.');
        onDone.setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/iduka', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah IDUKA.');
    } finally {
      setLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditData({
      nama_perusahaan: d.nama_perusahaan,
      alamat: d.alamat || '',
      telepon: d.telepon || '',
      latitude: d.latitude || '',
      longitude: d.longitude || '',
      radius_meter: d.radius_meter || '100',
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/iduka/${id}`, editData);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Hapus data IDUKA "${d.nama_perusahaan}"? Akun Instruktur/IDUKA yang mewakilinya tidak ikut terhapus, tapi kehilangan tautan ke perusahaan ini.`)) return;
    try {
      await api.delete(`/iduka/${d.id}`);
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
          IDUKA (Industri, Dunia Usaha, dan Dunia Kerja) = data perusahaan/instansi mitra, termasuk lokasi &amp; radius yang dipakai memvalidasi absen masuk/pulang siswa PKL lewat GPS. Daftar ini murni data master — akun login Instruktur dibuat terpisah di menu Kelola Instruktur, dengan memilih salah satu perusahaan dari sini.
        </p>
      </div>

      {canEdit && showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah IDUKA</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <input placeholder="Nama perusahaan/instansi" value={form.nama_perusahaan} onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })} className="field-input col-span-2" required />
            <input placeholder="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input col-span-2" />
            <input placeholder="No. HP/telepon (opsional)" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} className="field-input col-span-2" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-ink-500">Lokasi &amp; radius absensi (GPS)</p>
            <button
              type="button"
              onClick={() => ambilLokasi({ set: (loc) => setForm((f) => ({ ...f, ...loc })), setLocating })}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5" /> {locating ? 'Mengambil lokasi...' : 'Gunakan lokasi saat ini'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="field-input" required />
            <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="field-input" required />
            <input placeholder="Radius (meter)" type="number" value={form.radius_meter} onChange={(e) => setForm({ ...form, radius_meter: e.target.value })} className="field-input" required />
          </div>

          <div className="flex gap-2 mt-4">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah IDUKA'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar IDUKA <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h2>
          {canEdit && !showForm && (
            <button onClick={() => { setForm(emptyForm); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah IDUKA
            </button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Perusahaan</th>
              <th className="font-medium whitespace-nowrap px-2">Telepon</th>
              <th className="font-medium whitespace-nowrap px-2">Lokasi</th>
              {canEdit && <th className="pb-2 w-24 whitespace-nowrap px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {listHalaman.map((d) => (
              editId === d.id ? (
                <tr key={d.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="4" className="py-3 whitespace-nowrap px-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.nama_perusahaan} onChange={(e) => setEditData({ ...editData, nama_perusahaan: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Nama perusahaan" />
                      <input value={editData.alamat} onChange={(e) => setEditData({ ...editData, alamat: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Alamat" />
                      <input value={editData.telepon} onChange={(e) => setEditData({ ...editData, telepon: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="No. HP/telepon" />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-ink-500">Lokasi &amp; radius (GPS)</p>
                      <button
                        type="button"
                        onClick={() => ambilLokasi({ set: (loc) => setEditData((f) => ({ ...f, ...loc })), setLocating: setLocatingEdit })}
                        disabled={locatingEdit}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {locatingEdit ? 'Mengambil lokasi...' : 'Gunakan lokasi saat ini'}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input value={editData.latitude} onChange={(e) => setEditData({ ...editData, latitude: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Latitude" />
                      <input value={editData.longitude} onChange={(e) => setEditData({ ...editData, longitude: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Longitude" />
                      <input type="number" value={editData.radius_meter} onChange={(e) => setEditData({ ...editData, radius_meter: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Radius (m)" />
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
                  <td className="py-2.5 whitespace-nowrap px-2">
                    <p className="text-ink-900 font-medium"><TruncateText text={d.nama_perusahaan} /></p>
                    <p className="text-xs text-ink-500"><TruncateText text={d.alamat} /></p>
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">
                    {d.telepon || '-'}
                  </td>
                  <td className="text-ink-700 text-xs whitespace-nowrap px-2">
                    {d.latitude && d.longitude ? (
                      <>
                        <p>{Number(d.latitude).toFixed(5)}, {Number(d.longitude).toFixed(5)}</p>
                        <p className="text-ink-400">radius {d.radius_meter}m</p>
                      </>
                    ) : '-'}
                  </td>
                  {canEdit && (
                    <td className="text-right whitespace-nowrap px-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(d)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(d)} className="text-ink-300 hover:text-honey-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))}
            {list.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada IDUKA yang terdaftar.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
