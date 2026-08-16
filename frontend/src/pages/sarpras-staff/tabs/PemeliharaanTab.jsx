import { useEffect, useMemo, useState } from 'react';
import { Plus, ScanQrCode, X } from 'lucide-react';
import api from '../../../api/axios';
import AssetSearchSelect from '../../../components/AssetSearchSelect';
import QrCodeScanner from '../../../components/QrCodeScanner';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { fmtDMY } from '../../../utils/date';
import { useAuth } from '../../../context/AuthContext';

const STATUS_LABEL = { dilaporkan: 'Dilaporkan', diproses: 'Diproses', selesai: 'Selesai' };
const STATUS_BADGE = { dilaporkan: 'badge-soft', diproses: 'badge-honey', selesai: 'badge-brand' };
const FORM_KOSONG = { asset_id: '', deskripsi: '', pelapor: '', tanggal_lapor: new Date().toISOString().slice(0, 10) };

// Sama seperti Inventaris, laporan Kepala Bengkel otomatis dibatasi backend
// cuma untuk ruang tanggung jawabnya. Teknisi tidak dibatasi ruang — pilih
// aset dari ruang mana saja, ruang laporan otomatis ikut ruang asetnya.
export default function PemeliharaanTab() {
  const { user } = useAuth();
  const isTeknisi = user.role === 'teknisi';
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [formRoomFilter, setFormRoomFilter] = useState('');
  const [form, setForm] = useState(FORM_KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [scanning, setScanning] = useState(false);

  const load = () => api.get('/maintenance-requests').then((res) => setRequests(res.data));
  useEffect(() => {
    load();
    api.get('/assets').then((res) => setAssets(res.data));
    if (isTeknisi) api.get('/rooms').then((res) => setRooms(res.data));
  }, [isTeknisi]);

  const requestTersaring = useMemo(
    () => (roomFilter ? requests.filter((r) => String(r.room_id) === roomFilter) : requests),
    [requests, roomFilter]
  );
  const assetDiRuangTerpilih = formRoomFilter ? assets.filter((a) => String(a.room_id) === formRoomFilter) : assets;
  const { page, setPage, totalPages, paginated: requestHalaman } = usePagination(requestTersaring, 30);

  // Ruang dipakai sebagai filter aset di form (bukan target laporan) — pilih
  // ruang dulu untuk mempersempit daftar barang yang dicari.
  const handleFormRoomChange = (roomId) => {
    setFormRoomFilter(roomId);
    setForm((f) => {
      const asetMasihCocok = !f.asset_id || !roomId || assets.find((a) => String(a.id) === f.asset_id)?.room_id === Number(roomId);
      return asetMasihCocok ? f : { ...f, asset_id: '' };
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/maintenance-requests', { ...form, asset_id: form.asset_id || null });
      setForm(FORM_KOSONG);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal melapor kerusakan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (r, status) => {
    setSavingId(r.id);
    try {
      await api.put(`/maintenance-requests/${r.id}`, {
        status,
        tanggal_selesai: status === 'selesai' ? new Date().toISOString().slice(0, 10) : r.tanggal_selesai,
        catatan_penyelesaian: r.catatan_penyelesaian || '',
      });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const handleScan = async (code) => {
    try {
      const res = await api.get('/assets/qr', { params: { code } });
      const asset = res.data;
      setAssets((prev) => (prev.some((a) => a.id === asset.id) ? prev : [...prev, asset]));
      setForm((f) => ({ ...f, asset_id: String(asset.id) }));
      if (asset.room_id) setFormRoomFilter(String(asset.room_id));
      setScanning(false);
      return { message: `Aset ditemukan: ${asset.nama}, siap dilaporkan.`, error: false };
    } catch (err) {
      return { message: err.response?.data?.message || 'QR tidak dikenali.', error: true };
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Lapor Kerusakan / Pemeliharaan</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="space-y-3">
          {isTeknisi && (
            <select value={formRoomFilter} onChange={(e) => handleFormRoomChange(e.target.value)} className="field-input text-ink-700">
              <option value="">Semua ruang (filter aset)</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AssetSearchSelect
                assets={assetDiRuangTerpilih}
                value={form.asset_id}
                onChange={(id) => setForm({ ...form, asset_id: id })}
                placeholder={formRoomFilter ? 'Cari aset di ruang ini…' : 'Cari kode / nama / ruang…'}
              />
            </div>
            <button type="button" onClick={() => setScanning(true)} title="Pindai QR aset" className="w-11 h-11 flex items-center justify-center rounded-xl border border-line-200 text-ink-500 hover:text-brand-700 hover:bg-mist-50 transition shrink-0">
              <ScanQrCode className="w-4 h-4" />
            </button>
          </div>
          <DateInput value={form.tanggal_lapor} onChange={(e) => setForm({ ...form, tanggal_lapor: e.target.value })} className="field-input" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Pelapor" value={form.pelapor} onChange={(e) => setForm({ ...form, pelapor: e.target.value })} className="field-input" />
            <textarea placeholder="Deskripsi kerusakan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className="field-input" rows={2} required />
          </div>
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Lapor'}</button>
      </form>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Laporan <span className="text-ink-500 font-sans font-normal text-sm">({requestTersaring.length}/{requests.length})</span></h2>
          {isTeknisi && (
            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="field-input text-ink-700 w-44">
              <option value="">Semua Ruang</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          )}
        </div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal Lapor</th>
              <th className="font-medium whitespace-nowrap px-2">Aset</th>
              {isTeknisi && <th className="font-medium whitespace-nowrap px-2">Ruang</th>}
              <th className="font-medium whitespace-nowrap px-2">Deskripsi</th>
              <th className="font-medium whitespace-nowrap px-2">Pelapor</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {requestHalaman.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-700 whitespace-nowrap px-2">{fmtDMY(r.tanggal_lapor)}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{r.asset?.nama || '-'}</td>
                {isTeknisi && <td className="text-ink-700 whitespace-nowrap px-2">{r.room?.nama || '-'}</td>}
                <td className="text-ink-700 max-w-[16rem] whitespace-nowrap px-2">{r.deskripsi}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{r.pelapor || '-'}</td>
                <td className="text-center whitespace-nowrap px-2">
                  <select
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => handleUpdateStatus(r, e.target.value)}
                    className={`badge-soft ${STATUS_BADGE[r.status]} border-0`}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {requestTersaring.length === 0 && <tr><td colSpan={isTeknisi ? 6 : 5} className="py-6 text-center text-ink-300 whitespace-nowrap px-2">{requests.length === 0 ? 'Belum ada laporan pemeliharaan.' : 'Tidak ada laporan di ruang ini.'}</td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {scanning && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4" onClick={() => setScanning(false)}>
          <div className="surface-card p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink-900">Pindai QR Aset</h3>
              <button onClick={() => setScanning(false)} className="text-ink-300 hover:text-honey-700"><X className="w-5 h-5" /></button>
            </div>
            <QrCodeScanner onDecode={handleScan} />
          </div>
        </div>
      )}
    </div>
  );
}
