import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X, Download, Upload, Printer, BookOpen, ImagePlus, Trash2, PackagePlus, Pencil } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

const FORM_KOSONG = {
  judul: '', kode_buku: '', penulis: '', penerbit: '', tahun_terbit: '', isbn: '', kategori_id: '', sinopsis: '', rak_id: '', jumlah_eksemplar: 1,
};

const STATUS_BADGE = { tersedia: 'badge-brand', dipinjam: 'badge-honey', rusak: 'badge-rose', hilang: 'badge-rose' };

export default function KatalogTab() {
  const [buku, setBuku] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [rakList, setRakList] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(FORM_KOSONG);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tambahJumlah, setTambahJumlah] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => api.get('/perpustakaan-buku').then((res) => setBuku(res.data));
  useEffect(() => {
    load();
    api.get('/perpustakaan-kategori').then((res) => setKategoriList(res.data));
    api.get('/perpustakaan-rak').then((res) => setRakList(res.data));
  }, []);

  const bukuTersaring = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buku;
    return buku.filter((b) =>
      b.judul.toLowerCase().includes(q)
      || (b.penulis || '').toLowerCase().includes(q)
      || (b.kode_buku || '').toLowerCase().includes(q)
      || (b.kategori?.nama || '').toLowerCase().includes(q)
      || (b.rak?.nama || '').toLowerCase().includes(q)
    );
  }, [buku, query]);

  const { page, setPage, totalPages, paginated: bukuHalaman } = usePagination(bukuTersaring, 24);

  const handleDownloadTemplate = async () => {
    const res = await api.get('/perpustakaan-buku/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_buku.xlsx');
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
      const res = await api.post('/perpustakaan-buku/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      load();
    } catch (err) {
      setImportResult({ message: err.response?.data?.message || 'Gagal mengimpor data. Pastikan format file sesuai template.', gagal: [] });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const bukuId = editingId
        ? (await api.put(`/perpustakaan-buku/${editingId}`, form)).data.id
        : (await api.post('/perpustakaan-buku', form)).data.id;
      if (coverFile) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        await api.post(`/perpustakaan-buku/${bukuId}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setForm(FORM_KOSONG);
      setCoverFile(null);
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || (editingId ? 'Gagal menyimpan perubahan buku.' : 'Gagal menambah buku.'));
    } finally {
      setLoading(false);
    }
  };

  const bukaDetail = async (b) => {
    const res = await api.get(`/perpustakaan-buku/${b.id}`);
    setDetail(res.data);
    setTambahJumlah(1);
  };

  const bukaEdit = (b) => {
    setForm({
      judul: b.judul || '',
      kode_buku: b.kode_buku || '',
      penulis: b.penulis || '',
      penerbit: b.penerbit || '',
      tahun_terbit: b.tahun_terbit || '',
      isbn: b.isbn || '',
      kategori_id: b.kategori_id || '',
      sinopsis: b.sinopsis || '',
      rak_id: b.rak_id || '',
      jumlah_eksemplar: 1,
    });
    setCoverFile(null);
    setEditingId(b.id);
    setError('');
    setDetail(null);
    setShowForm(true);
  };

  const batalForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(FORM_KOSONG);
    setCoverFile(null);
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const res = await api.get(`/perpustakaan-buku/${detail.id}`);
    setDetail(res.data);
    load();
  };

  const tambahEksemplar = async () => {
    await api.post(`/perpustakaan-buku/${detail.id}/eksemplar`, { jumlah: tambahJumlah });
    setTambahJumlah(1);
    refreshDetail();
  };

  const ubahStatusEksemplar = async (eks, status) => {
    try {
      await api.put(`/perpustakaan-eksemplar/${eks.id}`, { status });
      refreshDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status.');
    }
  };

  const hapusEksemplar = async (eks) => {
    if (!confirm(`Hapus eksemplar ${eks.kode_eksemplar}?`)) return;
    try {
      await api.delete(`/perpustakaan-eksemplar/${eks.id}`);
      refreshDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus eksemplar.');
    }
  };

  const hapusBuku = async (b) => {
    if (!confirm(`Hapus buku "${b.judul}" beserta semua eksemplarnya?`)) return;
    try {
      await api.delete(`/perpustakaan-buku/${b.id}`);
      setDetail(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus buku (masih ada eksemplar dipinjam).');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data Buku dari Excel</h2>
        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition">
          <Download className="w-4 h-4" /> Download Template
        </button>
        <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl px-4 py-2 transition">
          <Upload className="w-4 h-4" /> {importing ? 'Mengimpor...' : 'Import Excel'}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
      </div>

      {importResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${importResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>{importResult.message}</p>
          {importResult.gagal?.length > 0 && (
            <div className="table-scroll">
              <table className="w-full text-sm mt-3">
                <thead><tr className="text-left text-ink-500 border-b border-line-200"><th className="pb-2 font-medium px-2">Baris</th><th className="font-medium px-2">Alasan Gagal</th></tr></thead>
                <tbody>{importResult.gagal.map((g, i) => (
                  <tr key={i} className="border-t border-line-200"><td className="py-2 text-ink-900 px-2">{g.baris}</td><td className="text-honey-700 px-2"><TruncateText text={g.alasan} maxWidth="20rem" /></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="surface-card p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-900">{editingId ? 'Edit Buku' : 'Tambah Buku'}</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Kode Buku (opsional)</label>
              <input placeholder="Mis. nomor katalog/akuisisi" value={form.kode_buku} onChange={(e) => setForm({ ...form, kode_buku: e.target.value })} className="field-input" />
            </div>
            <input placeholder="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="field-input" required />
            <input placeholder="Penulis" value={form.penulis} onChange={(e) => setForm({ ...form, penulis: e.target.value })} className="field-input" />
            <input placeholder="Penerbit" value={form.penerbit} onChange={(e) => setForm({ ...form, penerbit: e.target.value })} className="field-input" />
            <input type="number" placeholder="Tahun Terbit" value={form.tahun_terbit} onChange={(e) => setForm({ ...form, tahun_terbit: e.target.value })} className="field-input" />
            <input placeholder="ISBN" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="field-input" />
            <select value={form.kategori_id} onChange={(e) => setForm({ ...form, kategori_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Kategori —</option>
              {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <select value={form.rak_id} onChange={(e) => setForm({ ...form, rak_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Rak —</option>
              {rakList.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
            {!editingId && (
              <div>
                <label className="block text-[11px] text-ink-500 mb-1">Jumlah Eksemplar Awal (akan dibuatkan QR otomatis)</label>
                <input type="number" min="0" value={form.jumlah_eksemplar} onChange={(e) => setForm({ ...form, jumlah_eksemplar: e.target.value })} className="field-input" />
              </div>
            )}
          </div>
          <textarea placeholder="Sinopsis" value={form.sinopsis} onChange={(e) => setForm({ ...form, sinopsis: e.target.value })} className="field-input" rows={2} />
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1.5"><ImagePlus className="w-3.5 h-3.5" /> Cover {editingId ? '(kosongkan kalau tidak ingin mengganti)' : '(opsional)'}</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0] || null)} className="text-sm" />
          </div>
          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary">
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {loading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Buku')}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Katalog Buku <span className="text-ink-500 font-sans font-normal text-sm">({bukuTersaring.length}/{buku.length})</span></h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul / penulis / kode buku / kategori / rak..." className="field-input pl-9 w-full sm:w-64" />
            </div>
            <button onClick={() => window.open('/print/buku-label', '_blank')} disabled={buku.length === 0} className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 border border-line-200 rounded-xl px-4 py-2 transition shrink-0">
              <Printer className="w-4 h-4" /> Cetak Label QR
            </button>
            {!showForm && (
              <button onClick={() => { setEditingId(null); setForm(FORM_KOSONG); setCoverFile(null); setShowForm(true); }} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Buku</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {bukuHalaman.map((b) => (
            <button key={b.id} onClick={() => bukaDetail(b)} className="surface-card p-3 text-left hover:border-brand-300 transition border border-line-200">
              <div className="w-full aspect-[3/4] rounded-lg bg-mist-50 mb-2 flex items-center justify-center overflow-hidden">
                {b.cover_url ? <img src={b.cover_url} alt={b.judul} className="w-full h-full object-cover" /> : <BookOpen className="w-8 h-8 text-ink-300" />}
              </div>
              <p className="text-sm font-semibold text-ink-900 leading-tight"><TruncateText text={b.judul} maxWidth="100%" /></p>
              <p className="text-xs text-ink-500 mt-0.5"><TruncateText text={b.penulis || '-'} maxWidth="100%" /></p>
              {b.kategori && <p className="text-[10px] text-ink-400 mt-0.5">{b.kategori.nama}</p>}
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <span className="badge-soft badge-brand">{b.ringkasan_eksemplar?.tersedia ?? 0} tersedia</span>
                {b.ringkasan_eksemplar?.dipinjam > 0 && <span className="badge-soft badge-honey">{b.ringkasan_eksemplar.dipinjam} dipinjam</span>}
              </div>
            </button>
          ))}
          {bukuTersaring.length === 0 && <p className="col-span-full text-center text-ink-300 py-6">{buku.length === 0 ? 'Belum ada data buku.' : 'Tidak ada buku yang cocok dengan pencarian.'}</p>}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="surface-card p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink-900">{detail.judul}</h3>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => bukaEdit(detail)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                <button onClick={() => setDetail(null)} className="text-ink-300 hover:text-honey-700"><X className="w-5 h-5" /></button>
              </div>
            </div>
            {detail.kode_buku && <p className="text-xs font-mono text-ink-500 mb-1">{detail.kode_buku}</p>}
            <p className="text-xs text-ink-500 mb-4">{detail.penulis} · {detail.penerbit} · {detail.kategori?.nama || 'Tanpa kategori'} {detail.rak ? `· Rak ${detail.rak.nama}` : ''}</p>

            <div className="flex items-center gap-2 mb-3">
              <input type="number" min="1" value={tambahJumlah} onChange={(e) => setTambahJumlah(e.target.value)} className="field-input w-24" />
              <button onClick={tambahEksemplar} className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 transition">
                <PackagePlus className="w-4 h-4" /> Tambah Eksemplar
              </button>
            </div>

            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-ink-500 border-b border-line-200"><th className="pb-2 font-medium px-2">Kode QR</th><th className="font-medium px-2">Status</th><th className="px-2"></th></tr></thead>
                <tbody>
                  {detail.eksemplars?.map((eks) => (
                    <tr key={eks.id} className="border-t border-line-200">
                      <td className="py-2 font-mono text-xs text-ink-700 px-2">{eks.kode_eksemplar}</td>
                      <td className="px-2"><span className={`badge-soft ${STATUS_BADGE[eks.status]}`}>{eks.status}</span></td>
                      <td className="text-right px-2">
                        {eks.status !== 'dipinjam' && (
                          <div className="flex items-center justify-end gap-2">
                            {eks.status !== 'tersedia' && <button onClick={() => ubahStatusEksemplar(eks, 'tersedia')} className="text-xs text-brand-600 hover:underline">Set Tersedia</button>}
                            {eks.status !== 'rusak' && <button onClick={() => ubahStatusEksemplar(eks, 'rusak')} className="text-xs text-honey-700 hover:underline">Set Rusak</button>}
                            {eks.status !== 'hilang' && <button onClick={() => ubahStatusEksemplar(eks, 'hilang')} className="text-xs text-rose-700 hover:underline">Set Hilang</button>}
                            <button onClick={() => hapusEksemplar(eks)} className="text-ink-300 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!detail.eksemplars || detail.eksemplars.length === 0) && <tr><td colSpan={3} className="py-4 text-center text-ink-300 px-2">Belum ada eksemplar.</td></tr>}
                </tbody>
              </table>
            </div>

            <button onClick={() => hapusBuku(detail)} className="flex items-center gap-1.5 text-sm font-medium text-rose-700 hover:underline mt-4">
              <Trash2 className="w-4 h-4" /> Hapus Buku Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
