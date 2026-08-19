import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, FileDown } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_LABEL = { izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };

export default function PrintPklJurnal() {
  const { user } = useAuth();
  const { profile } = useSchoolProfile();
  const [params] = useSearchParams();
  const placementId = params.get('placement_id');

  const now = new Date();
  const [bulanPilih, setBulanPilih] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const [placement, setPlacement] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!placementId) {
      setError('Parameter placement_id tidak ada.');
      return;
    }

    const attendanceReq = user.role === 'siswa'
      ? api.get('/my-pkl-attendances')
      : api.get(`/pkl-placements/${placementId}/attendances`);

    Promise.all([
      api.get(`/pkl-placements/${placementId}`),
      attendanceReq,
    ])
      .then(([p, a]) => {
        setPlacement(p.data);
        setAttendances(a.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [placementId]); // eslint-disable-line

  const [tahun, bulan] = bulanPilih.split('-').map(Number);

  const rows = useMemo(() => {
    if (!tahun || !bulan) return [];
    const jumlahHari = new Date(tahun, bulan, 0).getDate();
    const byDate = Object.fromEntries(attendances.map((a) => [a.date, a]));

    return Array.from({ length: jumlahHari }, (_, i) => {
      const tgl = i + 1;
      const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
      const d = new Date(tahun, bulan - 1, tgl);
      const namaHari = HARI[d.getDay()];
      const row = byDate[dateStr];
      return { tgl, namaHari, dateStr, row };
    });
  }, [tahun, bulan, attendances]);

  const handleExportWord = async () => {
    const res = await api.get(`/pkl-placements/${placementId}/attendances/export-word`, {
      params: { bulan: bulanPilih },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Absensi-PKL-${placement.student?.user?.name || 'siswa'}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!placement) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const hariHadir = rows.filter((r) => r.row?.status === 'hadir');
  const adaBelumVerifikasi = hariHadir.some((r) => !r.row.verified_at);

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white text-ink-900 relative">
      <div className="no-print flex justify-between items-center mb-6">
        <select value={bulanPilih} onChange={(e) => setBulanPilih(e.target.value)} className="field-input text-sm">
          {Array.from({ length: 12 }, (_, i) => {
            const y = now.getFullYear();
            const m = i + 1;
            const val = `${y}-${String(m).padStart(2, '0')}`;
            return <option key={val} value={val}>{BULAN[i]} {y}</option>;
          })}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportWord}
            className="flex items-center gap-2 bg-white text-ink-700 border border-line-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-mist-50"
          >
            <FileDown className="w-4 h-4" /> Export ke Word
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Printer className="w-4 h-4" /> Print / Simpan PDF
          </button>
        </div>
      </div>

      {adaBelumVerifikasi && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span
            className="whitespace-nowrap tracking-widest font-medium"
            style={{ fontSize: '64px', color: 'rgba(220,38,38,0.16)', transform: 'rotate(-35deg)' }}
          >
            BELUM VERIFIKASI
          </span>
        </div>
      )}

      <div className="mb-6 text-sm">
        <p className="font-bold flex items-center gap-1.5">
          <span>◆</span> {profile.nama_sekolah.toUpperCase()}
        </p>
        <p className="font-bold text-xs ml-4">JURNAL PRAKTIK KERJA LAPANGAN {tahun}</p>
      </div>

      <h1 className="text-center font-bold text-lg mb-6">DAFTAR HADIR PESERTA PKL</h1>

      <table className="text-sm mb-6">
        <tbody>
          <tr>
            <td className="pr-3 py-0.5 align-top w-48">Nama Murid</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.student?.user?.name}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Kompetensi Keahlian</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.student?.class_room?.name || '-'}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Tempat PKL/Nama Iduka</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.dudi?.nama_perusahaan}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Bulan</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{BULAN[bulan - 1]} {tahun}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th rowSpan="2" className="border border-ink-400 px-2 py-2 w-32">Hari, tanggal</th>
            <th colSpan="2" className="border border-ink-400 px-2 py-1">Absensi Kerja</th>
            <th rowSpan="2" className="border border-ink-400 px-2 py-2 w-28">Ket. Tidak Hadir</th>
            <th rowSpan="2" className="border border-ink-400 px-2 py-2 w-28">Paraf Instruktur</th>
          </tr>
          <tr>
            <th className="border border-ink-400 px-2 py-1 w-16">Datang</th>
            <th className="border border-ink-400 px-2 py-1 w-16">Pulang</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dateStr}>
              <td className="border border-ink-400 px-2 py-1.5">{r.namaHari}, {r.tgl}</td>
              <td className="border border-ink-400 px-2 py-1.5 text-center">
                {r.row?.time_in ? r.row.time_in.slice(0, 5) : ''}
              </td>
              <td className="border border-ink-400 px-2 py-1.5 text-center">
                {r.row?.time_out ? r.row.time_out.slice(0, 5) : ''}
              </td>
              <td className="border border-ink-400 px-2 py-1.5 text-center">
                {r.row && r.row.status !== 'hadir' ? STATUS_LABEL[r.row.status] : ''}
              </td>
              <td className="border border-ink-400 px-2 py-1.5 text-center">
                {r.row?.verified_at ? (
                  r.row.verified_by?.dudi?.tanda_tangan_url ? (
                    <img src={r.row.verified_by.dudi.tanda_tangan_url} alt="Tanda tangan" className="h-8 mx-auto object-contain" />
                  ) : '✓'
                ) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 text-xs">
        <p className="font-medium mb-1">Keterangan pengisian:</p>
        <ol className="list-[lower-alpha] list-inside space-y-0.5">
          <li>Satu halaman ini untuk daftar hadir 1 bulan</li>
          <li>Daftar hadir diisi oleh perorangan/individu masing-masing</li>
          <li>Kolom hari/tanggal diisi hari dan tanggal pelaksanaan</li>
          <li>
            Absensi kerja diisi berdasarkan:
            <ul className="list-none ml-5">
              <li>✓ Jam datang</li>
              <li>✓ Jam pulang</li>
            </ul>
          </li>
          <li>Kolom keterangan tidak hadir (diisi jika peserta PKL yang bersangkutan tidak hadir dalam melaksanakan PKL)</li>
          <li>Paraf diisi oleh Instruktur Dunia Kerja.</li>
        </ol>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: portrait; margin: 15mm 15mm 15mm 25mm; }
      `}</style>
    </div>
  );
}
