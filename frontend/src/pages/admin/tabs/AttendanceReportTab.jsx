import { useEffect, useState } from 'react';
import { Search, Info } from 'lucide-react';
import api from '../../../api/axios';

export default function AttendanceReportTab() {
  const [report, setReport] = useState([]);
  const [classes, setClasses] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classRoomId, setClassRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadReport = () => {
    setLoading(true);
    const params = {};
    if (date) params.date = date;
    if (classRoomId) params.class_room_id = classRoomId;
    api.get('/attendance/report', { params })
      .then((res) => setReport(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReport(); }, []);

  const totalHadir = report.filter((r) => r.status === 'hadir').length;
  const totalTelat = report.filter((r) => r.status === 'telat').length;
  const totalAlpa = report.filter((r) => r.status === 'alpa').length;

  const badgeClass = (status) => {
    if (status === 'telat') return 'badge-honey';
    if (status === 'alpa') return 'badge-rose';
    return 'badge-brand';
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={loadReport} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-brand">Hadir: {totalHadir}</span>
          <span className="badge-soft badge-honey">Telat: {totalTelat}</span>
          <span className="badge-soft badge-rose">Alpa: {totalAlpa}</span>
        </div>
      </div>

      {!classRoomId && (
        <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
          <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700">
            Pilih kelas tertentu untuk melihat siswa yang <b>belum/tidak absen (alpa)</b> sekaligus. Saat "Semua Kelas" dipilih, hanya siswa yang sudah tercatat absennya yang ditampilkan.
          </p>
        </div>
      )}

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Rekap Absensi {date && <span className="text-ink-500 font-sans font-normal text-sm">— {date}</span>}
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th><th className="font-medium">Kelas</th><th className="font-medium">Jam Masuk</th><th className="font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900">{r.student?.user?.name}</td>
                  <td className="text-ink-700">{r.student?.class_room?.name || '-'}</td>
                  <td className="font-mono text-xs text-ink-700">{r.time_in || '-'}</td>
                  <td>
                    <span className={`badge-soft ${badgeClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {report.length === 0 && (
                <tr><td colSpan="4" className="py-6 text-center text-ink-300">Tidak ada data absensi untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
