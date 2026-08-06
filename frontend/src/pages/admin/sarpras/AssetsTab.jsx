import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Search, QrCode, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../../../api/axios';
import { filterAssets } from '../../../components/AssetSearchSelect';

const KONDISI_LABEL = { baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat' };
const KONDISI_BADGE = { baik: 'badge-brand', rusak_ringan: 'badge-honey', rusak_berat: 'badge-soft' };

export default function AssetsTab() {
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ kode_aset: '', nama: '', kategori: '', kondisi: 'baik', jumlah: 1, room_id: '', tanggal_perolehan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [barcodeAsset, setBarcodeAsset] = useState(null);
  const [barcodeImg, setBarcodeImg] = useState('');
  const [zipping, setZipping] = useState(false);

  const load = () => api.get('/assets').then((res) => setAssets(res.data));
  useEffect(() => { load(); api.get('/rooms').then((res) => setRooms(res.data)); }, []);

  const assetTersaring = useMemo(() => filterAssets(assets, query), [assets, query]);

  const showBarcode = async (a) => {
    setBarcodeAsset(a);
    setBarcodeImg(await QRCode.toDataURL(a.kode_aset, { width: 320, margin: 2, color: { dark: '#22344A', light: '#FFFFFF' } }));
  };

  const downloadAllBarcodes = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const a of assets) {
        const dataUrl = await QRCode.toDataURL(a.kode_aset, { width: 400, margin: 2 });
        zip.file(`${a.kode_aset}_${a.nama}.png`, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'barcode_aset.zip');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat ZIP barcode.');
    } finally {
      setZipping(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/assets', { ...form, room_id: form.room_id || null });
      setForm({ kode_aset: '', nama: '', kategori: '', kondisi: 'baik', jumlah: 1, room_id: '', tanggal_perolehan: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah aset.');
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Aset</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="Kode aset" value={form.kode_aset} onChange={(e) => setForm({ ...form, kode_aset: e.target.value })} className="field-input" required />
          <input placeholder="Nama aset" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <input placeholder="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="field-input" />
          <select value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })} className="field-input text-ink-700">
            {Object.entries(KONDISI_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input type="number" min="1" placeholder="Jumlah" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} className="field-input" required />
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="field-input text-ink-700">
            <option value="">Tanpa ruang</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
          <input type="date" value={form.tanggal_perolehan} onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })} className="field-input" />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Aset'}</button>
      </form>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Aset <span className="text-ink-500 font-sans font-normal text-sm">({assetTersaring.length}/{assets.length})</span></h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode / nama / kategori / ruang…" className="field-input pl-9 w-64" />
            </div>
            <button
              onClick={downloadAllBarcodes}
              disabled={zipping || assets.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
            >
              <Download className="w-4 h-4" /> {zipping ? 'Membuat ZIP...' : 'Unduh Semua Barcode'}
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Kode</th>
              <th className="font-medium">Nama</th>
              <th className="font-medium">Ruang</th>
              <th className="font-medium text-center">Jumlah</th>
              <th className="font-medium text-center">Kondisi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assetTersaring.map((a) => (
              <tr key={a.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500">{a.kode_aset}</td>
                <td className="text-ink-900">{a.nama}</td>
                <td className="text-ink-700">{a.room?.nama || '-'}</td>
                <td className="text-center text-ink-700">{a.jumlah}</td>
                <td className="text-center"><span className={`badge-soft ${KONDISI_BADGE[a.kondisi]}`}>{KONDISI_LABEL[a.kondisi]}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => showBarcode(a)} title="Lihat barcode" className="text-ink-300 hover:text-brand-700"><QrCode className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a)} title="Hapus" className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {assetTersaring.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-ink-300">{assets.length === 0 ? 'Belum ada data aset.' : 'Tidak ada aset yang cocok dengan pencarian.'}</td></tr>}
          </tbody>
        </table>
      </div>

      {barcodeAsset && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4" onClick={() => setBarcodeAsset(null)}>
          <div className="surface-card p-5 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink-900 truncate">{barcodeAsset.nama}</h3>
              <button onClick={() => setBarcodeAsset(null)} className="text-ink-300 hover:text-honey-700 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            {barcodeImg && <img src={barcodeImg} alt={barcodeAsset.kode_aset} className="mx-auto rounded-lg" width={220} height={220} />}
            <p className="font-mono text-sm text-ink-700 mt-2">{barcodeAsset.kode_aset}</p>
            <a
              href={barcodeImg}
              download={`${barcodeAsset.kode_aset}.png`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition mt-3"
            >
              <Download className="w-4 h-4" /> Unduh
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
