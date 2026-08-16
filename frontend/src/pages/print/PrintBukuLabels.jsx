import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../../api/axios';

// Label cetak eksemplar buku — sengaja CUMA kode + QR (buat ditempel fisik
// di buku), dikelompokkan per judul. Parameter "buku_id" opsional -> cetak
// eksemplar 1 judul saja, tanpa parameter -> cetak semua eksemplar.
export default function PrintBukuLabels() {
  const [params] = useSearchParams();
  const bukuId = params.get('buku_id');

  const [eksemplars, setEksemplars] = useState(null);
  const [qrMap, setQrMap] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/perpustakaan-eksemplar', { params: bukuId ? { buku_id: bukuId } : {} })
      .then((res) => setEksemplars(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data eksemplar.'));
  }, [bukuId]);

  useEffect(() => {
    if (!eksemplars) return;
    let batal = false;
    (async () => {
      const map = {};
      for (const e of eksemplars) {
        // margin lebih lebar (quiet zone) supaya kamera lebih gampang fokus
        // & mendeteksi tepi QR saat label sudah dicetak fisik kecil.
        map[e.id] = await QRCode.toDataURL(e.kode_eksemplar, { width: 300, margin: 3, color: { dark: '#22344A', light: '#FFFFFF' } });
      }
      if (!batal) setQrMap(map);
    })();
    return () => { batal = true; };
  }, [eksemplars]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!eksemplars) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const semuaQrSiap = eksemplars.length > 0 && Object.keys(qrMap).length >= eksemplars.length;

  const kelompok = Object.values(
    eksemplars.reduce((acc, e) => {
      const key = e.judul || 'Tanpa Judul';
      acc[key] = acc[key] || { nama: key, items: [] };
      acc[key].items.push(e);
      return acc;
    }, {})
  );

  return (
    <div className="p-6 bg-white text-ink-900 min-h-screen">
      <div className="no-print flex justify-between items-center mb-6">
        <h1 className="font-display text-lg font-semibold">Cetak Label Buku ({eksemplars.length})</h1>
        <button
          onClick={() => window.print()}
          disabled={!semuaQrSiap}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" /> {semuaQrSiap ? 'Print / Simpan PDF' : 'Menyiapkan QR...'}
        </button>
      </div>

      {eksemplars.length === 0 && <p className="text-center text-ink-400">Tidak ada eksemplar untuk dicetak.</p>}

      {kelompok.map((grup, gi) => (
        <div key={gi} className="mb-6 break-inside-avoid">
          <h2 className="font-semibold text-sm text-ink-700 mb-2 border-b border-ink-300 pb-1">{grup.nama}</h2>
          <div className="grid grid-cols-3 gap-3">
            {grup.items.map((e) => (
              <div key={e.id} className="border border-ink-300 rounded-lg p-2 flex flex-col items-center text-center break-inside-avoid">
                {qrMap[e.id] ? (
                  <img src={qrMap[e.id]} alt={e.kode_eksemplar} className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-xs text-ink-300">...</div>
                )}
                <p className="font-mono text-base font-bold mt-1 break-all">{e.kode_eksemplar}</p>
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
