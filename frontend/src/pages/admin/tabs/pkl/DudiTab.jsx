import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Building2, MapPin, KeyRound, Download, Upload } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';
import { useAuth } from '../../../../context/AuthContext';

const emptyForm = {
  name: '',
  nama_perusahaan: '', alamat: '', penanggung_jawab: '', telepon: '',
  latitude: '', longitude: '', radius_meter: '100',
};

export default function DudiTab() {
  const { user } = useAuth();
  // Waka Kurikulum cuma boleh lihat daftar IDUKA (dipakai buat pilih IDUKA
  // di form Penempatan PKL) — kelola IDUKA (tambah/edit/hapus/reset
  // password) sekarang eksklusif milik Waka Humas, backend-nya juga sudah
  // menolak Kurikulum di endpoint-endpoint tersebut.
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

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const load = () => api.get('/dudi').then((res) => setList(res.data));
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
      // Nama akun login dipakai dari "Nama Instruktur" — tidak perlu diketik terpisah lagi.
      await api.post('/dudi', { ...form, name: form.penanggung_jawab });
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
      penanggung_jawab: d.penanggung_jawab || '',
      telepon: d.telepon || '',
      latitude: d.latitude || '',
      longitude: d.longitude || '',
      radius_meter: d.radius_meter || '100',
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
    if (!confirm(`Hapus akun IDUKA "${d.nama_perusahaan}"? Penempatan PKL yang terhubung ke IDUKA ini juga akan terhapus.`)) return;
    try {
      await api.delete(`/dudi/${d.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  const handleResetPassword = async (d) => {
    if (!confirm(`Reset password akun IDUKA "${d.nama_perusahaan}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/dudi/${d.id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get('/dudi/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_iduka.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/dudi/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      load();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.message || 'Gagal mengimpor data. Pastikan format file sesuai template.',
        gagal: [],
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Building2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          IDUKA (Industri, Dunia Usaha, dan Dunia Kerja) = perusahaan/instansi tempat siswa PKL. Setiap IDUKA punya akun login sendiri untuk memantau kehadiran dan memverifikasi absensi siswa bimbingannya. Lokasi &amp; radius dipakai untuk memvalidasi absen masuk/pulang siswa lewat GPS.
        </p>
      </div>

      {canEdit && (
        <div className="surface-card p-5 flex flex-wrap items-center gap-3">
          <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data IDUKA dari Excel</h2>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl px-4 py-2 transition"
          >
            <Upload className="w-4 h-4" /> {importing ? 'Mengimpor...' : 'Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {importResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${importResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
            {importResult.message}
          </p>
          {importResult.gagal?.length > 0 && (
            <div className="table-scroll">
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Baris</th>
                  <th className="font-medium whitespace-nowrap px-2">Kolom</th>
                  <th className="font-medium whitespace-nowrap px-2">Alasan Gagal</th>
                </tr>
              </thead>
              <tbody>
                {importResult.gagal.map((g, i) => (
                  <tr key={i} className="border-t border-line-200">
                    <td className="py-2 text-ink-900 whitespace-nowrap px-2">{g.baris}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{g.kolom}</td>
                    <td className="text-honey-700 whitespace-nowrap px-2"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {canEdit && showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Akun IDUKA</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <p className="text-xs font-medium text-ink-500 mb-2">Akun login</p>
          <p className="text-xs text-ink-500 mb-2">Login pakai No. HP di bawah ini (bukan email). Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input placeholder="Nama Instruktur" value={form.penanggung_jawab} onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })} className="field-input" required />
            <input placeholder="No. HP (login)" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} className="field-input" required autoComplete="off" />
          </div>

          <p className="text-xs font-medium text-ink-500 mb-2">Profil perusahaan</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input placeholder="Nama perusahaan/instansi" value={form.nama_perusahaan} onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })} className="field-input col-span-2" required />
            <input placeholder="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input col-span-2" />
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
              <th className="font-medium whitespace-nowrap px-2">Kontak</th>
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
                      <input value={editData.nama_perusahaan} onChange={(e) => setEditData({ ...editData, nama_perusahaan: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama perusahaan" />
                      <input value={editData.penanggung_jawab} onChange={(e) => setEditData({ ...editData, penanggung_jawab: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama Instruktur" />
                      <input value={editData.alamat} onChange={(e) => setEditData({ ...editData, alamat: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Alamat" />
                      <input value={editData.telepon} onChange={(e) => setEditData({ ...editData, telepon: e.target.value })} className="field-input py-1.5 text-sm" placeholder="No. HP (login)" required />
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
                    <p><TruncateText text={d.penanggung_jawab} /></p>
                    <p className="text-xs text-ink-500">{d.telepon || '-'}</p>
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
                        <button onClick={() => handleResetPassword(d)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                          <KeyRound className="w-4 h-4" />
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
