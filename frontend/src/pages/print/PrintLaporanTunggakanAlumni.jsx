import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

// Cetak tunggakan SPP alumni dari menu Alumni TU — kalau ?kelas=... dikirim
// (lagi buka 1 kelas di layar), cetak cuma kelas asal itu. Kalau tidak,
// cetak SEMUA alumni sekaligus, dikelompokkan & diurutkan per kelas asal
// (bukan 1 tabel campur aduk) — alumni yang sudah lunas tetap ikut tercetak
// (ditandai "Lunas"), bukan cuma yang masih bertunggakan.
export default function PrintLaporanTunggakanAlumni() {
  const [params] = useSearchParams();
  const kelasFilter = params.get('kelas') || '';
  const { profile } = useSchoolProfile();

  const [alumni, setAlumni] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/spp/alumni')
      .then((res) => setAlumni(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, []);

  const kelasKelompok = useMemo(() => {
    if (!alumni) return [];
    const map = new Map();
    for (const a of alumni) {
      const nama = a.student.class_room?.name || 'Tanpa Kelas Asal';
      if (kelasFilter && nama !== kelasFilter) continue;
      if (!map.has(nama)) map.set(nama, []);
      map.get(nama).push(a);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'id'))
      .map(([nama, rows]) => ({
        nama,
        rows,
        total: rows.reduce((sum, r) => sum + Number(r.total_tunggakan || 0), 0),
      }));
  }, [alumni, kelasFilter]);

  const grandTotal = kelasKelompok.reduce((sum, k) => sum + k.total, 0);
  const totalAlumni = kelasKelompok.reduce((sum, k) => sum + k.rows.length, 0);
  const totalBertunggakan = kelasKelompok.reduce((sum, k) => sum + k.rows.filter((r) => r.total_tunggakan > 0).length, 0);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (alumni === null) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const judul = kelasFilter
    ? `LAPORAN TUNGGAKAN ALUMNI — KELAS ASAL ${kelasFilter.toUpperCase()}`
    : 'LAPORAN TUNGGAKAN ALUMNI SELURUH KELAS';

  return (
    <div className="p-6 bg-mist-50 min-h-screen">
      <div className="no-print flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <h1 className="font-display text-lg font-semibold text-ink-900">{judul}</h1>
        <div className="flex items-center gap-2">
          <PrintKembaliButton />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Printer className="w-4 h-4" /> Print / Simpan PDF
          </button>
        </div>
      </div>

      <div className="lembar max-w-3xl mx-auto bg-white">
        <div className="lembar-header">
          {profile?.logo_url && <img src={profile.logo_url} alt="" className="lembar-logo" />}
          <div>
            <p className="lembar-sekolah">{profile?.nama_sekolah}</p>
            <p className="lembar-judul">{judul}</p>
          </div>
        </div>

        <div className="lembar-body">
          <p className="text-xs text-ink-500 mb-4">
            {totalAlumni} alumni · {totalBertunggakan} bertunggakan · Total Tunggakan {formatRupiah(grandTotal)}
          </p>

          {kelasKelompok.length === 0 ? (
            <p className="text-center text-ink-500 py-10 text-sm">Tidak ada data alumni untuk kelas ini.</p>
          ) : (
            <>
              {kelasKelompok.map((kelas) => (
                <div key={kelas.nama} className="kelas-section">
                  <p className="kelas-judul">Kelas Asal {kelas.nama}</p>
                  <table className="tunggakan-tabel">
                    <thead>
                      <tr>
                        <th className="text-left">Nama Alumni</th>
                        <th className="text-left">NIS</th>
                        <th className="text-left">Tgl Lulus</th>
                        <th className="text-right">Tunggakan SPP</th>
                        <th className="text-right">Tunggakan Lain</th>
                        <th className="text-right">Total Tunggakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kelas.rows.map((row) => (
                        <tr key={row.student.id}>
                          <td>{row.student.user?.name}</td>
                          <td>{row.student.nis || '-'}</td>
                          <td>{row.student.tanggal_lulus ? row.student.tanggal_lulus.slice(0, 10).split('-').reverse().join('-') : '-'}</td>
                          <td className="text-right">{formatRupiah(row.tunggakan_spp)}</td>
                          <td className="text-right">{formatRupiah(row.tunggakan_lain)}</td>
                          <td className="text-right font-semibold">
                            {row.total_tunggakan > 0 ? formatRupiah(row.total_tunggakan) : 'Lunas'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="text-right font-semibold">Subtotal {kelas.nama}</td>
                        <td className="text-right font-semibold">{formatRupiah(kelas.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              <div className="total-box">
                <span>Total Tunggakan Alumni Keseluruhan</span>
                <span className="total-angka">{formatRupiah(grandTotal)}</span>
              </div>

              <div className="flex justify-end mt-8 text-xs">
                <div className="text-center">
                  <p>Sampit, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Petugas TU,</p>
                  <div className="h-14" />
                  <p className="border-t border-ink-400 pt-1 inline-block px-4">( ..................... )</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .lembar {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
        }
        .lembar-header {
          background: #0B1B3A;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lembar-logo { width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 6px; padding: 3px; }
        .lembar-sekolah { color: #fff; font-size: 13px; font-weight: 700; }
        .lembar-judul { color: #F2B705; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; margin-top: 2px; }
        .lembar-body { padding: 24px; }

        .kelas-section { margin-bottom: 20px; break-inside: avoid; }
        .kelas-judul { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; }
        .tunggakan-tabel { width: 100%; font-size: 12px; border-collapse: collapse; border: 1px solid #E2E8F0; }
        .tunggakan-tabel th { text-align: left; color: #64748b; font-weight: 600; padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; }
        .tunggakan-tabel td { padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155; }
        .tunggakan-tabel tfoot td { background: #F8FAFC; border: 1px solid #E2E8F0; }
        .tunggakan-tabel th:nth-child(3), .tunggakan-tabel td:nth-child(3) { width: 11%; white-space: nowrap; }
        .tunggakan-tabel th:nth-child(4), .tunggakan-tabel td:nth-child(4),
        .tunggakan-tabel th:nth-child(5), .tunggakan-tabel td:nth-child(5),
        .tunggakan-tabel th:nth-child(6), .tunggakan-tabel td:nth-child(6) { width: 14%; white-space: nowrap; }

        .total-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FEF3E2;
          border: 1px solid #FDE0A8;
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 4px;
        }
        .total-angka { font-size: 16px; font-weight: 800; color: #92400E; }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .lembar { border: none; }
          .lembar, .lembar * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4 portrait; margin: 14mm; }
      `}</style>
    </div>
  );
}
