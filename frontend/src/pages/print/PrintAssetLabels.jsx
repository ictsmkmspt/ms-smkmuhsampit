import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import QRCode from 'qrcode';
import api from '../../api/axios';

// Label cetak aset — sengaja CUMA kode + QR (buat ditempel fisik di barang),
// tanpa info lain. Tanpa parameter "ids" -> cetak semua aset yang bisa
// diakses akun ini sekaligus, dikelompokkan per ruangan.
export default function PrintAssetLabels() {
  const [params] = useSearchParams();
  const idsParam = params.get('ids');
  const idSet = idsParam ? new Set(idsParam.split(',').map((s) => s.trim())) : null;

  const [assets, setAssets] = useState(null);
  const [qrMap, setQrMap] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/assets')
      .then((res) => {
        const data = idSet ? res.data.filter((a) => idSet.has(String(a.id))) : res.data;
        setAssets(data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data aset.'));
  }, [idsParam]);

  useEffect(() => {
    if (!assets) return;
    let batal = false;
    (async () => {
      const map = {};
      for (const a of assets) {
        // margin lebih lebar (quiet zone) supaya kamera lebih gampang fokus
        // & mendeteksi tepi QR saat label sudah dicetak fisik kecil.
        map[a.id] = await QRCode.toDataURL(a.kode_aset, { width: 300, margin: 3, color: { dark: '#22344A', light: '#FFFFFF' } });
      }
      if (!batal) setQrMap(map);
    })();
    return () => { batal = true; };
  }, [assets]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!assets) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const semuaQrSiap = assets.length > 0 && Object.keys(qrMap).length >= assets.length;

  const kelompok = idSet
    ? [{ nama: null, items: assets }]
    : Object.values(
        assets.reduce((acc, a) => {
          const key = a.room?.nama || 'Tanpa Ruang';
          acc[key] = acc[key] || { nama: key, items: [] };
          acc[key].items.push(a);
          return acc;
        }, {})
      );

  return (
    <div className="p-6 bg-white text-ink-900 min-h-screen">
      <div className="no-print flex justify-between items-center mb-6">
        <h1 className="font-display text-lg font-semibold">Cetak Label Aset ({assets.length})</h1>
        <div className="flex items-center gap-2">
          <PrintKembaliButton />
          <button
            onClick={() => window.print()}
            disabled={!semuaQrSiap}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> {semuaQrSiap ? 'Print / Simpan PDF' : 'Menyiapkan QR...'}
          </button>
        </div>
      </div>

      {assets.length === 0 && <p className="text-center text-ink-400">Tidak ada aset untuk dicetak.</p>}

      {kelompok.map((grup, gi) => (
        <div key={gi} className="mb-6 break-inside-avoid">
          {grup.nama && <h2 className="font-semibold text-sm text-ink-700 mb-2 border-b border-ink-300 pb-1">{grup.nama}</h2>}
          <div className="grid grid-cols-3 gap-3">
            {grup.items.map((a) => (
              <div key={a.id} className="border border-ink-300 rounded-lg p-2 flex flex-col items-center text-center break-inside-avoid">
                {qrMap[a.id] ? (
                  <img src={qrMap[a.id]} alt={a.kode_aset} className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-xs text-ink-300">...</div>
                )}
                <p className="font-mono text-base font-bold mt-1 break-all">{a.kode_aset}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { size: A4; margin: 10mm; }
      `}</style>
    </div>
  );
}
