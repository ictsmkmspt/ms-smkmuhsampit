import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

// Surat tagihan (bukan nota pembayaran) — merangkum SEMUA tagihan SPP &
// Tagihan Lain 1 siswa yang belum lunas (belum_bayar + sebagian) jadi 1
// dokumen, dipakai TU dari Laporan Perorangan untuk diserahkan ke orang tua.
// Beda dari PrintSppNota.jsx/PrintTagihanLainNota.jsx yang cetak nota 1
// transaksi YANG SUDAH lunas.
export default function PrintTagihanBelumBayar() {
  const [params] = useSearchParams();
  const studentId = params.get('student_id');
  const { profile } = useSchoolProfile();

  const [student, setStudent] = useState(null);
  const [spp, setSpp] = useState([]);
  const [tagihanLain, setTagihanLain] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) {
      setError('Parameter tidak lengkap (student_id).');
      return;
    }
    Promise.all([
      api.get(`/spp/siswa/${studentId}`),
      api.get(`/tagihan-lain/siswa/${studentId}`),
    ])
      .then(([resSpp, resLain]) => {
        setSpp(resSpp.data.spp);
        setTagihanLain(resLain.data.tagihan);
        setStudent(resSpp.data.student || resLain.data.student || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [studentId]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (student === null && !error) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const sppBelum = spp.filter((s) => s.status !== 'lunas');
  const lainBelum = tagihanLain.filter((t) => t.status !== 'lunas');
  const sisaSpp = (s) => s.nominal - (s.jumlah_dibayar || 0);
  const sisaLain = (t) => t.nominal - (t.jumlah_dibayar || 0);
  const totalTunggakan = sppBelum.reduce((sum, s) => sum + sisaSpp(s), 0) + lainBelum.reduce((sum, t) => sum + sisaLain(t), 0);

  return (
    <div className="p-6 bg-mist-50 min-h-screen">
      <div className="no-print flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <h1 className="font-display text-lg font-semibold text-ink-900">Tagihan Belum Bayar — {student?.user?.name}</h1>
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

      <div className="lembar max-w-2xl mx-auto bg-white">
        <div className="lembar-header">
          {profile?.logo_url && <img src={profile.logo_url} alt="" className="lembar-logo" />}
          <div>
            <p className="lembar-sekolah">{profile?.nama_sekolah}</p>
            <p className="lembar-judul">SURAT TAGIHAN BELUM LUNAS</p>
          </div>
        </div>

        <div className="lembar-body">
          <table className="lembar-tabel lembar-tabel-full">
            <tbody>
              <tr><td className="lembar-label">Nama Siswa</td><td>{student?.user?.name}</td></tr>
              <tr><td className="lembar-label">Kelas</td><td>{student?.class_room?.name || '-'}</td></tr>
              <tr><td className="lembar-label">NIS</td><td>{student?.nis || '-'}</td></tr>
            </tbody>
          </table>

          {sppBelum.length === 0 && lainBelum.length === 0 ? (
            <p className="text-center text-brand-700 py-10 text-sm">Tidak ada tagihan yang belum lunas — semua sudah dibayar.</p>
          ) : (
            <>
              {sppBelum.length > 0 && (
                <div className="tagihan-section">
                  <p className="tagihan-judul">SPP</p>
                  <table className="tagihan-tabel">
                    <thead>
                      <tr>
                        <th className="text-left">Bulan</th>
                        <th className="text-right">Nominal</th>
                        <th className="text-right">Dibayar</th>
                        <th className="text-right">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sppBelum.map((s) => (
                        <tr key={s.id}>
                          <td>{BULAN[s.bulan - 1]} {s.tahun}</td>
                          <td className="text-right">{formatRupiah(s.nominal)}</td>
                          <td className="text-right">{formatRupiah(s.jumlah_dibayar || 0)}</td>
                          <td className="text-right font-semibold">{formatRupiah(sisaSpp(s))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {lainBelum.length > 0 && (
                <div className="tagihan-section">
                  <p className="tagihan-judul">Tagihan Lain</p>
                  <table className="tagihan-tabel">
                    <thead>
                      <tr>
                        <th className="text-left">Nama Tagihan</th>
                        <th className="text-right">Nominal</th>
                        <th className="text-right">Dibayar</th>
                        <th className="text-right">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lainBelum.map((t) => (
                        <tr key={t.id}>
                          <td>{t.nama_tagihan}</td>
                          <td className="text-right">{formatRupiah(t.nominal)}</td>
                          <td className="text-right">{formatRupiah(t.jumlah_dibayar || 0)}</td>
                          <td className="text-right font-semibold">{formatRupiah(sisaLain(t))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="total-box">
                <span>Total Tunggakan</span>
                <span className="total-angka">{formatRupiah(totalTunggakan)}</span>
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
        .lembar-tabel { width: 100%; font-size: 13px; border-collapse: collapse; }
        .lembar-tabel td { padding: 5px 8px; text-align: left; vertical-align: top; }
        .lembar-tabel-full { margin-bottom: 20px; }
        .lembar-tabel-full td { border-bottom: 1px solid #F1F5F9; }
        .lembar-label { color: #64748b; font-weight: 600; width: 30%; }

        .tagihan-section { margin-bottom: 18px; }
        .tagihan-judul { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; }
        .tagihan-tabel { width: 100%; font-size: 12px; border-collapse: collapse; border: 1px solid #E2E8F0; }
        .tagihan-tabel th { text-align: left; color: #64748b; font-weight: 600; padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; }
        .tagihan-tabel td { padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155; }
        .tagihan-tabel th:nth-child(2), .tagihan-tabel td:nth-child(2),
        .tagihan-tabel th:nth-child(3), .tagihan-tabel td:nth-child(3),
        .tagihan-tabel th:nth-child(4), .tagihan-tabel td:nth-child(4) {
          width: 22%;
          white-space: nowrap;
        }

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
