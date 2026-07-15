import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/axios';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_LABEL = { hadir: 'H', izin: 'I', sakit: 'S', alpa: 'A', libur: 'L' };

export default function PrintMonthlyAttendance() {
  const [params] = useSearchParams();
  const classRoomId = params.get('class_room_id');
  const month = Number(params.get('month'));
  const year = Number(params.get('year'));

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classRoomId || !month || !year) {
      setError('Parameter tidak lengkap (kelas/bulan/tahun).');
      return;
    }
    api.get('/attendance/monthly-report', { params: { class_room_id: classRoomId, month, year } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [classRoomId, month, year]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!data) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const days = Array.from({ length: data.days_in_month }, (_, i) => i + 1);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white text-ink-900">
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-lg font-bold uppercase tracking-wide">Rekap Absensi Bulanan</h1>
        <p className="text-sm">Kelas {data.class_room.name} — {BULAN[data.month - 1]} {data.year}</p>
      </div>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th rowSpan="2" className="border border-ink-400 px-1 py-1">No</th>
            <th rowSpan="2" className="border border-ink-400 px-2 py-1 text-left">Nama Siswa</th>
            <th colSpan={days.length} className="border border-ink-400 px-1 py-1">Tanggal</th>
            <th colSpan="5" className="border border-ink-400 px-1 py-1">Rekap</th>
          </tr>
          <tr>
            {days.map((d) => <th key={d} className="border border-ink-400 w-4 px-0.5 py-1">{d}</th>)}
            <th className="border border-ink-400 px-1 py-1">H</th>
            <th className="border border-ink-400 px-1 py-1">I</th>
            <th className="border border-ink-400 px-1 py-1">S</th>
            <th className="border border-ink-400 px-1 py-1">A</th>
            <th className="border border-ink-400 px-1 py-1">L</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((row, idx) => (
            <tr key={row.student.id}>
              <td className="border border-ink-400 text-center">{idx + 1}</td>
              <td className="border border-ink-400 px-2 whitespace-nowrap">{row.student.user?.name}</td>
              {days.map((d) => (
                <td key={d} className="border border-ink-400 text-center">
                  {row.days[d] ? STATUS_LABEL[row.days[d]] : ''}
                </td>
              ))}
              <td className="border border-ink-400 text-center">{row.counts.hadir}</td>
              <td className="border border-ink-400 text-center">{row.counts.izin}</td>
              <td className="border border-ink-400 text-center">{row.counts.sakit}</td>
              <td className="border border-ink-400 text-center">{row.counts.alpa}</td>
              <td className="border border-ink-400 text-center">{row.counts.libur}</td>
            </tr>
          ))}
          {data.students.length === 0 && (
            <tr><td colSpan={days.length + 7} className="border border-ink-400 py-4 text-center">Belum ada siswa di kelas ini.</td></tr>
          )}
        </tbody>
      </table>

      <p className="text-[10px] mt-3">Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alpa, L = Libur</p>

      <div className="flex justify-end mt-16 text-sm">
        <div className="text-center">
          <p>Mengetahui,</p>
          <p>Wali Kelas {data.class_room.name}</p>
          <div className="h-16" />
          <p className="border-t border-ink-400 pt-1 inline-block px-4">( ..................................... )</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: landscape; margin: 10mm; }
      `}</style>
    </div>
  );
}
