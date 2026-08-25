import { useEffect, useState } from 'react';
import { Wallet, CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

/**
 * Rekap keuangan PPDB — kartu ringkasan + buku kas semua transaksi
 * pembayaran, difilter per periode PPDB (lihat PengaturanPpdbTab untuk
 * kelola periodenya). Dibangun di atas endpoint yang sama dengan modal
 * pembayaran di FormulirPpdbTab (ppdb_pembayarans), cuma sudut pandangnya
 * "semua transaksi" bukan "per pendaftar".
 */
export default function KeuanganPpdbTab() {
  const [periodeList, setPeriodeList] = useState([]);
  const [periodeId, setPeriodeId] = useState('');
  const [ringkasan, setRingkasan] = useState(null);
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ppdb-periode').then((res) => {
      setPeriodeList(res.data);
      const aktif = res.data.find((pr) => pr.status === 'aktif');
      if (aktif) setPeriodeId(String(aktif.id));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/ppdb-keuangan/ringkasan', { params: { ppdb_periode_id: periodeId || undefined } }),
      api.get('/ppdb-keuangan/transaksi', { params: { ppdb_periode_id: periodeId || undefined } }),
    ]).then(([r, t]) => {
      setRingkasan(r.data);
      setTransaksi(t.data);
    }).finally(() => setLoading(false));
  }, [periodeId]);

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Rekap seluruh transaksi pembayaran biaya pendaftaran PPDB (tunai/transfer, dicatat manual admin). Filter per periode di bawah — atur periode PPDB & nominal biayanya di menu <strong>Pengaturan PPDB</strong>.
        </p>
      </div>

      <div className="surface-card p-5 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-ink-700">Periode PPDB</label>
        <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value)} className="field-input text-ink-700 w-64">
          <option value="">Semua Periode</option>
          {periodeList.map((pr) => <option key={pr.id} value={pr.id}>{pr.nama}{pr.status === 'aktif' ? ' (Aktif)' : ''}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink-300">Memuat...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="surface-card p-4">
              <div className="flex items-center gap-2 text-ink-500 mb-1"><Wallet className="w-4 h-4" /><p className="text-xs font-medium">Total Pemasukan</p></div>
              <p className="text-xl font-display font-bold text-ink-900">{rupiah(ringkasan?.total_pemasukan)}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">{ringkasan?.jumlah_pendaftar ?? 0} pendaftar</p>
            </div>
            <div className="surface-card p-4">
              <div className="flex items-center gap-2 text-brand-600 mb-1"><CheckCircle2 className="w-4 h-4" /><p className="text-xs font-medium">Lunas</p></div>
              <p className="text-xl font-display font-bold text-ink-900">{ringkasan?.lunas ?? 0}</p>
            </div>
            <div className="surface-card p-4">
              <div className="flex items-center gap-2 text-honey-600 mb-1"><Clock className="w-4 h-4" /><p className="text-xs font-medium">Dicicil</p></div>
              <p className="text-xl font-display font-bold text-ink-900">{ringkasan?.dicicil ?? 0}</p>
            </div>
            <div className="surface-card p-4">
              <div className="flex items-center gap-2 text-ink-400 mb-1"><CircleDashed className="w-4 h-4" /><p className="text-xs font-medium">Belum Bayar</p></div>
              <p className="text-xl font-display font-bold text-ink-900">{ringkasan?.belum_bayar ?? 0}</p>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-display font-semibold text-ink-900 mb-4">Riwayat Transaksi <span className="text-ink-500 font-sans font-normal text-sm">({transaksi.length})</span></h2>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                    <th className="font-medium whitespace-nowrap px-2">Pendaftar</th>
                    <th className="font-medium whitespace-nowrap px-2">Kode</th>
                    <th className="font-medium text-right whitespace-nowrap px-2">Nominal</th>
                    <th className="font-medium whitespace-nowrap px-2">Metode</th>
                    <th className="font-medium whitespace-nowrap px-2">Catatan</th>
                    <th className="font-medium whitespace-nowrap px-2">Dicatat Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.map((t) => (
                    <tr key={t.id} className="border-t border-line-200">
                      <td className="py-2 text-ink-700 whitespace-nowrap px-2">{t.tanggal_bayar}</td>
                      <td className="text-ink-900 whitespace-nowrap px-2"><TruncateText text={t.pendaftar?.nama_lengkap || '—'} /></td>
                      <td className="font-mono text-xs text-ink-500 whitespace-nowrap px-2">{t.pendaftar?.kode_pendaftaran || '—'}</td>
                      <td className="text-right font-medium text-ink-900 whitespace-nowrap px-2">{rupiah(t.nominal)}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{t.metode === 'tunai' ? 'Tunai' : 'Transfer'}</td>
                      <td className="text-ink-500 whitespace-nowrap px-2"><TruncateText text={t.catatan || '—'} /></td>
                      <td className="text-ink-500 whitespace-nowrap px-2">{t.dicatat_oleh?.name || '—'}</td>
                    </tr>
                  ))}
                  {transaksi.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada transaksi pembayaran di periode ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
