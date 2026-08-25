import { useEffect, useState } from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

const statusBadge = (status) => {
  if (status === 'lunas') return <span className="badge-soft badge-brand">Lunas</span>;
  if (status === 'sebagian') return <span className="badge-soft badge-honey">Sebagian</span>;
  return <span className="badge-soft badge-rose">Belum Bayar</span>;
};

/**
 * Tagihan (SPP + Tagihan Lain) milik alumni sendiri — READ-ONLY, alumni
 * cuma bisa lihat status & nominal, pembayaran/koreksi tetap ditangani TU
 * (menu TU > Alumni). Dipakai sebagai menu default saat alumni login,
 * lihat SiswaDashboard.jsx.
 */
export default function AlumniTagihanTab() {
  const [spp, setSpp] = useState(null);
  const [tagihanLain, setTagihanLain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/my-spp').then((res) => setSpp(res.data)),
      api.get('/my-tagihan-lain').then((res) => setTagihanLain(res.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center text-ink-300 py-10 text-sm">Memuat tagihan...</p>;
  }

  const tunggakanSpp = (spp || []).filter((s) => s.status !== 'lunas');
  const tunggakanLain = (tagihanLain || []).filter((t) => t.status !== 'lunas');
  const totalTunggakan =
    tunggakanSpp.reduce((sum, s) => sum + (s.nominal - (s.jumlah_dibayar || 0)), 0) +
    tunggakanLain.reduce((sum, t) => sum + (t.nominal - (t.jumlah_dibayar || 0)), 0);

  const renderRow = (label, item) => {
    const sisa = item.nominal - (item.jumlah_dibayar || 0);
    return (
      <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{label}</p>
          <p className="text-xs text-ink-500">
            {formatRupiah(item.nominal)}
            {item.status === 'sebagian' && (
              <span className="text-honey-700"> · sudah dibayar {formatRupiah(item.jumlah_dibayar)}, sisa {formatRupiah(sisa)}</span>
            )}
          </p>
        </div>
        <div className="shrink-0">{statusBadge(item.status)}</div>
      </li>
    );
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="surface-card p-5 mb-4">
        {totalTunggakan > 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-500">Total Tunggakan (SPP + Tagihan Lain)</p>
            <p className="text-lg font-display font-semibold text-honey-700">{formatRupiah(totalTunggakan)}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <p className="text-sm text-ink-700">Semua tagihan sudah lunas.</p>
          </div>
        )}
      </div>

      <div className="surface-card p-5 mb-4">
        <p className="text-xs font-medium text-ink-500 mb-1">SPP</p>
        {(spp || []).length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-3">Belum ada tagihan SPP.</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {spp.map((s) => renderRow(`${BULAN[s.bulan - 1]} ${s.tahun}`, s))}
          </ul>
        )}
      </div>

      <div className="surface-card p-5">
        <p className="text-xs font-medium text-ink-500 mb-1 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Tagihan Lain</p>
        {(tagihanLain || []).length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-3">Belum ada tagihan lain.</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {tagihanLain.map((t) => renderRow(t.nama_tagihan, t))}
          </ul>
        )}
      </div>
    </div>
  );
}
