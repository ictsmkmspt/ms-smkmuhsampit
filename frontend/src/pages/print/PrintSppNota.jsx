import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

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
  const { profile } = useSchoolProfile();

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
    <div className="p-4 bg-white text-ink-900 text-sm" style={{ maxWidth: '105mm' }}>
      <div className="no-print flex justify-end gap-2 mb-4">
        <PrintKembaliButton />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="mb-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {profile.logo_url && (
            <img src={profile.logo_url} alt="Logo Sekolah" className="w-8 h-8 object-contain shrink-0" />
          )}
          <p className="font-bold text-base">{profile.nama_sekolah.toUpperCase()}</p>
        </div>
        <h1 className="font-bold text-sm mt-1">NOTA PEMBAYARAN SPP</h1>
      </div>

      <table className="w-full text-xs mb-3">
        <tbody>
          <tr>
            <td className="pr-2 py-0.5 align-top w-24">Nama Siswa</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.user?.name}</td>
          </tr>
          <tr>
            <td className="pr-2 py-0.5 align-top">Kelas</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.class_room?.name || '-'}</td>
          </tr>
          <tr>
            <td className="pr-2 py-0.5 align-top">NIS</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{spp.student?.nis}</td>
          </tr>
          <tr>
            <td className="pr-2 py-0.5 align-top">Untuk Bulan</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{BULAN[spp.bulan - 1]} {spp.tahun}</td>
          </tr>
          <tr>
            <td className="pr-2 py-0.5 align-top">Tanggal Bayar</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{formatTanggal(spp.tanggal_bayar)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-b border-ink-400 py-2 mb-4 flex items-center justify-between text-xs">
        <span className="font-medium">Jumlah Dibayar</span>
        <span className="font-bold text-sm">{formatRupiah(spp.nominal)}</span>
      </div>

      <div className="flex justify-end text-xs">
        <div className="text-center">
          <p>Petugas TU,</p>
          <div className="h-10" />
          <p className="border-t border-ink-400 pt-1 inline-block px-4">{spp.dicatat_oleh?.name || '( ..................... )'}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { size: A6; margin: 5mm 5mm 5mm 5mm; }
      `}</style>
    </div>
  );
}
