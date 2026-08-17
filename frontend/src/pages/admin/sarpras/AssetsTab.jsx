import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Search, QrCode, Download, X, Printer, FileSpreadsheet, Upload } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../../../api/axios';
import { filterAssets } from '../../../components/AssetSearchSelect';
import ExportKirModal from '../../../components/ExportKirModal';
import TruncateText from '../../../components/TruncateText';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

const FORM_KOSONG = {
  nama: '', merk_model: '', no_seri_pabrik: '', ukuran: '', bahan: '', tanggal_perolehan: '', kode_aset: '',
  jumlah_baik: 1, jumlah_rusak_ringan: 0, jumlah_rusak_berat: 0, room_id: '', keterangan: '',
};

export default function AssetsTab() {
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [qrAsset, setQrAsset] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [zipping, setZipping] = useState(false);
  const [showExportKir, setShowExportKir] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => api.get('/assets').then((res) => setAssets(res.data));
  useEffect(() => { load(); api.get('/rooms').then((res) => setRooms(res.data)); }, []);

  const handleDownloadTemplate = async () => {
    const res = await api.get('/assets/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_aset.xlsx');
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
      const res = await api.post('/assets/import', formData, {
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

  const assetTersaring = useMemo(() => filterAssets(assets, query), [assets, query]);
  const { page, setPage, totalPages, paginated: assetHalaman } = usePagination(assetTersaring, 40);

  const showQrCode = async (a) => {
    setQrAsset(a);
    setQrImg(await QRCode.toDataURL(a.kode_aset, { width: 320, margin: 2, color: { dark: '#22344A', light: '#FFFFFF' } }));
  };

  const downloadAllQrCodes = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const a of assets) {
        const dataUrl = await QRCode.toDataURL(a.kode_aset, { width: 400, margin: 2 });
        zip.file(`${a.kode_aset}_${a.nama}.png`, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'qr_aset.zip');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat ZIP QR.');
    } finally {
      setZipping(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/assets', { ...form, room_id: form.room_id || null });
      setForm(FORM_KOSONG);
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah aset.');
    } finally {
      setLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm(FORM_KOSONG);
    setError('');
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus aset "${a.nama}"?`)) return;
    try {
      await api.delete(`/assets/${a.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Tidak bisa dihapus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display font-semibold text-ink-900 mr-auto">Import Data Aset dari Excel</h2>
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
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
      </div>

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

      {showForm && (
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Aset</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input placeholder="Nama aset" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <input placeholder="Merk/Model" value={form.merk_model} onChange={(e) => setForm({ ...form, merk_model: e.target.value })} className="field-input" />
          <input placeholder="No. Seri Pabrik" value={form.no_seri_pabrik} onChange={(e) => setForm({ ...form, no_seri_pabrik: e.target.value })} className="field-input" />
          <input placeholder="Ukuran" value={form.ukuran} onChange={(e) => setForm({ ...form, ukuran: e.target.value })} className="field-input" />
          <input placeholder="Bahan" value={form.bahan} onChange={(e) => setForm({ ...form, bahan: e.target.value })} className="field-input" />
          <DateInput value={form.tanggal_perolehan} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} className="field-input" />
          <input placeholder="Kode Barang" value={form.kode_aset} onChange={(e) => setForm({ ...form, kode_aset: e.target.value })} className="field-input" required />
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="field-input text-ink-700">
            <option value="">Tanpa ruang</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
          <input placeholder="Ket. Mutasi dll" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="field-input col-span-2 sm:col-span-4" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Jumlah per Kondisi</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Baik</label>
              <input type="number" min="0" value={form.jumlah_baik} onChange={(e) => setForm({ ...form, jumlah_baik: e.target.value })} className="field-input" />
            </div>
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Rusak Ringan</label>
              <input type="number" min="0" value={form.jumlah_rusak_ringan} onChange={(e) => setForm({ ...form, jumlah_rusak_ringan: e.target.value })} className="field-input" />
            </div>
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Rusak Berat</label>
              <input type="number" min="0" value={form.jumlah_rusak_berat} onChange={(e) => setForm({ ...form, jumlah_rusak_berat: e.target.value })} className="field-input" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Aset'}</button>
          <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
        </div>
      </form>
      )}

      <div className="surface-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold text-ink-900">Daftar Aset <span className="text-ink-500 font-sans font-normal text-sm">({assetTersaring.length}/{assets.length})</span></h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode / nama / ruang…" className="field-input pl-9 w-full sm:w-64" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {!showForm && (
                <button onClick={() => { setForm(FORM_KOSONG); setError(''); setShowForm(true); }} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Aset</button>
              )}
              <button
                onClick={downloadAllQrCodes}
                disabled={zipping || assets.length === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
              >
                <Download className="w-4 h-4" /> {zipping ? 'Membuat ZIP...' : 'Unduh Semua QR'}
              </button>
              <button
                onClick={() => window.open('/print/aset-label', '_blank')}
                disabled={assets.length === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
              >
                <Printer className="w-4 h-4" /> Cetak Semua (per Ruangan)
              </button>
              <button
                onClick={() => setShowExportKir(true)}
                disabled={rooms.length === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export KIR (Excel)
              </button>
            </div>
          </div>
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Kode Barang</th>
              <th className="font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Merk/Model</th>
              <th className="font-medium whitespace-nowrap px-2">No. Seri Pabrik</th>
              <th className="font-medium whitespace-nowrap px-2">Ukuran</th>
              <th className="font-medium whitespace-nowrap px-2">Bahan</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Tahun</th>
              <th className="font-medium whitespace-nowrap px-2">Ruang</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Baik</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Rusak Ringan</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Rusak Berat</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Total</th>
              <th className="font-medium whitespace-nowrap px-2">Ket. Mutasi</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {assetHalaman.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500 whitespace-nowrap px-2">{a.kode_aset}</td>
                <td className="text-ink-900 whitespace-nowrap px-2">{a.nama}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.merk_model || '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.no_seri_pabrik || '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.ukuran || '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.bahan || '-'}</td>
                <td className="text-center text-ink-700 whitespace-nowrap px-2">{a.tanggal_perolehan ? a.tanggal_perolehan.slice(0, 4) : '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.room?.nama || '-'}</td>
                <td className="text-center whitespace-nowrap px-2">{a.jumlah_baik > 0 ? <span className="badge-soft badge-brand">{a.jumlah_baik}</span> : '-'}</td>
                <td className="text-center whitespace-nowrap px-2">{a.jumlah_rusak_ringan > 0 ? <span className="badge-soft badge-honey">{a.jumlah_rusak_ringan}</span> : '-'}</td>
                <td className="text-center whitespace-nowrap px-2">{a.jumlah_rusak_berat > 0 ? <span className="badge-soft badge-rose">{a.jumlah_rusak_berat}</span> : '-'}</td>
                <td className="text-center text-ink-700 font-medium whitespace-nowrap px-2">{a.jumlah}</td>
                <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={a.keterangan || '-'} maxWidth="10rem" /></td>
                <td className="text-right whitespace-nowrap px-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => showQrCode(a)} title="Lihat QR" className="text-ink-300 hover:text-brand-700"><QrCode className="w-4 h-4" /></button>
                    <button onClick={() => window.open(`/print/aset-label?ids=${a.id}`, '_blank')} title="Cetak label" className="text-ink-300 hover:text-brand-700"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a)} title="Hapus" className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {assetTersaring.length === 0 && <tr><td colSpan="14" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">{assets.length === 0 ? 'Belum ada data aset.' : 'Tidak ada aset yang cocok dengan pencarian.'}</td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {qrAsset && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4" onClick={() => setQrAsset(null)}>
          <div className="surface-card p-5 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink-900 truncate">{qrAsset.nama}</h3>
              <button onClick={() => setQrAsset(null)} className="text-ink-300 hover:text-honey-700 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            {qrImg && <img src={qrImg} alt={qrAsset.kode_aset} className="mx-auto rounded-lg" width={220} height={220} />}
            <p className="font-mono text-sm text-ink-700 mt-2">{qrAsset.kode_aset}</p>
            <a
              href={qrImg}
              download={`${qrAsset.kode_aset}.png`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition mt-3"
            >
              <Download className="w-4 h-4" /> Unduh
            </a>
          </div>
        </div>
      )}

      {showExportKir && <ExportKirModal rooms={rooms} onClose={() => setShowExportKir(false)} />}
    </div>
  );
}
