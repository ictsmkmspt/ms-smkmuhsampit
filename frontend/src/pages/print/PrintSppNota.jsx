import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/axios';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const formatTanggal = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d} ${BULAN[Number(m) - 1]} ${y}`;
};

export default function PrintSppNota() {
  const [params] = useSearchParams();
  const sppId = params.get('spp_id');

  const [spp, setSpp] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sppId) {
      setError('Parameter tidak lengkap (spp_id).');
      return;
    }
    api.get(`/spp/${sppId}`)
      .then((res) => setSpp(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [sppId]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!spp) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  if (spp.status !== 'lunas') {
    return <div className="p-8 text-center text-honey-700">Tagihan ini belum lunas — nota hanya bisa dicetak setelah pembayaran tercatat.</div>;
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white text-ink-900">
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="text-center mb-5">
        <p className="font-bold flex items-center justify-center gap-1.5">
          <span>◆</span> SMK MUHAMMADIYAH SAMPIT
        </p>
        <h1 className="font-bold text-lg mt-1">NOTA PEMBAYARAN SPP</h1>
      </div>

      <table className="w-full text-sm mb-5">
        <tbody>
          <tr>
            <td className="pr-3 py-0.5 align-top w-36">No. Nota</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">SPP-{String(spp.id).padStart(5, '0')}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Nama Siswa</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.user?.name}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Kelas</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.class_room?.name || '-'}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">NIS</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.nis}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Untuk Bulan</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{BULAN[spp.bulan - 1]} {spp.tahun}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Tanggal Bayar</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{formatTanggal(spp.tanggal_bayar)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-b border-ink-400 py-3 mb-8 flex items-center justify-between">
        <span className="font-medium">Jumlah Dibayar</span>
        <span className="font-bold text-lg">{formatRupiah(spp.nominal)}</span>
      </div>

      <div className="flex justify-end text-sm">
        <div className="text-center">
          <p>Petugas TU,</p>
          <div className="h-16" />
          <p className="border-t border-ink-400 pt-1 inline-block px-4">{spp.dicatat_oleh?.name || '( ..................................... )'}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: A5; margin: 15mm; }
      `}</style>
    </div>
  );
}
