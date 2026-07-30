import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function PrintPklPembimbingan() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const dudiId = params.get('dudi_id');
  const entryId = params.get('entry_id');
  const dudiNamaParam = params.get('dudi_nama');

  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/pkl-pembimbingan', { params: dudiId ? { dudi_id: dudiId } : {} })
      .then((res) => {
        let data = res.data;
        if (entryId) {
          data = data.filter((e) => String(e.id) === String(entryId));
        }
        setEntries([...data].sort((a, b) => a.date.localeCompare(b.date)));
        setLoaded(true);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [dudiId, entryId]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!loaded) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const namaTempatPkl = entries[0]?.dudi?.nama_perusahaan || dudiNamaParam || '-';

  const namaPembimbing = entries.length > 0
    ? [...new Set(entries.map((e) => e.teacher?.user?.name).filter(Boolean))].join(', ') || '-'
    : (user.role === 'guru' ? user.name : '-');

  const adaBelumVerifikasi = entries.some((e) => !e.verified_at);

  return (
    <div className="p-8 max-w-5xl mx-auto bg-white text-ink-900 relative overflow-hidden">
      {adaBelumVerifikasi && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 40 }}
        >
          <span
            style={{
              transform: 'rotate(-45deg)',
              color: 'rgba(220, 38, 38, 0.18)',
              fontSize: 'clamp(3rem, 9vw, 7rem)',
              fontWeight: 800,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
          >
            BELUM VERIFIKASI
          </span>
        </div>
      )}
      <div className="no-print flex justify-end items-center mb-6">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <h1 className="text-center font-bold text-lg mb-6">JURNAL PEMBIMBING PKL</h1>

      <table className="text-sm mb-6">
        <tbody>
          <tr>
            <td className="pr-3 py-0.5 align-top w-56">Nama Pembimbing Sekolah</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{namaPembimbing}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Tempat PKL</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{namaTempatPkl}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-ink-400 px-2 py-2 w-10" style={{ backgroundColor: '#DFF5F1' }}>NO</th>
            <th className="border border-ink-400 px-2 py-2 w-28" style={{ backgroundColor: '#DFF5F1' }}>HARI, TANGGAL</th>
            <th className="border border-ink-400 px-2 py-2" style={{ backgroundColor: '#DFF5F1' }}>AKTIVITAS PEMBIMBINGAN</th>
            <th className="border border-ink-400 px-2 py-2" style={{ backgroundColor: '#DFF5F1' }}>CATATAN/TEMUAN/MASALAH</th>
            <th className="border border-ink-400 px-2 py-2 w-36" style={{ backgroundColor: '#DFF5F1' }}>PARAF PIMPINAN/PEMBIMBING IDUKA</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.id}>
              <td className="border border-ink-400 px-2 py-6 text-center align-top">{i + 1}</td>
              <td className="border border-ink-400 px-2 py-6 align-top">{e.date}</td>
              <td className="border border-ink-400 px-2 py-6 align-top whitespace-pre-wrap">{e.aktivitas}</td>
              <td className="border border-ink-400 px-2 py-6 align-top whitespace-pre-wrap">{e.catatan || ''}</td>
              <td className="border border-ink-400 px-2 py-6 text-center align-top">
                {e.verified_at ? (
                  e.verified_by?.dudi?.tanda_tangan_url ? (
                    <img src={e.verified_by.dudi.tanda_tangan_url} alt="Tanda tangan" className="h-10 mx-auto object-contain" />
                  ) : '✓'
                ) : ''}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={`blank-${i}`}>
                <td className="border border-ink-400 px-2 py-6">&nbsp;</td>
                <td className="border border-ink-400 px-2 py-6">&nbsp;</td>
                <td className="border border-ink-400 px-2 py-6">&nbsp;</td>
                <td className="border border-ink-400 px-2 py-6">&nbsp;</td>
                <td className="border border-ink-400 px-2 py-6">&nbsp;</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: landscape; margin: 15mm 15mm 15mm 25mm; }
      `}</style>
    </div>
  );
}
