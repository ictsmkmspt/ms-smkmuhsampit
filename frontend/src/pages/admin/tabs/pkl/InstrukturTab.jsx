import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, UserCog, KeyRound, Download, Upload } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';
import { useAuth } from '../../../../context/AuthContext';

const emptyForm = { name: '', telepon: '', email: '', iduka_id: '' };

/**
 * Kelola akun Instruktur — pembimbing PKL lapangan di 1 perusahaan mitra
 * (IDUKA) yang SUDAH ADA (dipilih dari dropdown, bukan input ulang). 1
 * perusahaan bisa punya lebih dari 1 akun Instruktur (mis. beberapa
 * pembimbing berbeda di perusahaan besar).
 */
export default function InstrukturTab() {
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'waka_humas';
  const [list, setList] = useState([]);
  const [idukaList, setIdukaList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const load = () => api.get('/instruktur').then((res) => setList(res.data));
  useEffect(() => {
    load();
    api.get('/iduka').then((res) => setIdukaList(res.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/instruktur', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah Instruktur.');
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
    setEditData({ name: d.name, telepon: d.phone || '', email: d.email || '', iduka_id: d.iduka_id || '' });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/instruktur/${id}`, editData);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Hapus akun Instruktur "${d.name}"? Penempatan PKL yang terhubung ke akun ini juga akan terhapus.`)) return;
    try {
      await api.delete(`/instruktur/${d.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  const handleResetPassword = async (d) => {
    if (!confirm(`Reset password akun Instruktur "${d.name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/instruktur/${d.id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/iduka/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_import_iduka.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh template.');
    }
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
      const res = await api.post('/iduka/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      load();
      api.get('/iduka').then((r) => setIdukaList(r.data));
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
        <UserCog className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Instruktur = akun login pembimbing PKL lapangan, mewakili 1 IDUKA yang sudah terdaftar di Master Data. Setiap Instruktur bisa memantau kehadiran dan memverifikasi absensi siswa bimbingannya. Import Excel di bawah membuat IDUKA baru sekaligus akun Instrukturnya dalam 1 baris — kalau IDUKA-nya sudah ada, tambahkan Instruktur manual lewat tombol di bawah supaya tidak dobel data perusahaan.
        </p>
      </div>

      {canEdit && (
        <div className="surface-card p-5 flex flex-wrap items-center gap-3">
          <h2 className="font-display font-semibold text-ink-900 mr-auto">Import IDUKA + Instruktur dari Excel</h2>
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
          <h2 className="font-display font-semibold text-ink-900 mb-4">Tambah Akun Instruktur</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <p className="text-xs text-ink-500 mb-2">Login bisa pakai No. HP atau email (kalau diisi) — email opsional, disiapkan untuk login ke fitur BKK nanti. Password akun otomatis dibuat "123456" — wajib diganti saat login pertama.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input placeholder="Nama Instruktur" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" required />
            <input placeholder="No. HP (login)" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} className="field-input" required autoComplete="off" />
            <input type="email" placeholder="Email (opsional, untuk login BKK nanti)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input col-span-2" autoComplete="off" />
            <select value={form.iduka_id} onChange={(e) => setForm({ ...form, iduka_id: e.target.value })} className="field-input col-span-2" required>
              <option value="">Pilih IDUKA...</option>
              {idukaList.map((d) => <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Instruktur'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Instruktur <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h2>
          {canEdit && !showForm && (
            <button onClick={() => { setForm(emptyForm); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Tambah Instruktur
            </button>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Instruktur</th>
              <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
              {canEdit && <th className="pb-2 w-24 whitespace-nowrap px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {listHalaman.map((d) => (
              editId === d.id ? (
                <tr key={d.id} className="border-t border-line-200 bg-mist-50">
                  <td colSpan="3" className="py-3 whitespace-nowrap px-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama Instruktur" />
                      <input value={editData.telepon} onChange={(e) => setEditData({ ...editData, telepon: e.target.value })} className="field-input py-1.5 text-sm" placeholder="No. HP (login)" required />
                      <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Email (opsional, untuk login BKK nanti)" />
                      <select value={editData.iduka_id} onChange={(e) => setEditData({ ...editData, iduka_id: e.target.value })} className="field-input py-1.5 text-sm col-span-2">
                        {idukaList.map((di) => <option key={di.id} value={di.id}>{di.nama_perusahaan}</option>)}
                      </select>
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
                    <p className="text-ink-900 font-medium"><TruncateText text={d.name} /></p>
                    <p className="text-xs text-ink-500">{d.phone || '-'}{d.email ? ` · ${d.email}` : ''}</p>
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">
                    <TruncateText text={d.iduka?.nama_perusahaan || '-'} />
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
              <tr><td colSpan="3" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada Instruktur yang terdaftar.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
