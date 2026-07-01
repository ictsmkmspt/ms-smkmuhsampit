import { useEffect, useState } from 'react';
import { Search, AlertOctagon } from 'lucide-react';
import api from '../../../api/axios';

export default function ViolationReportTab() {
  const [summary, setSummary] = useState([]);
  const [detail, setDetail] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classRoomId, setClassRoomId] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadData = () => {
    setLoading(true);
    const params = {};
    if (classRoomId) params.class_room_id = classRoomId;
    const detailParams = { ...params };
    if (date) detailParams.date = date;

    Promise.all([
      api.get('/violations/summary', { params }),
      api.get('/violations/detail', { params: detailParams }),
    ]).then(([resSummary, resDetail]) => {
      setSummary(resSummary.data);
      setDetail(resDetail.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const totalTelat = summary.reduce((sum, s) => sum + (s.telat_count || 0), 0);
  const totalAlpa = summary.reduce((sum, s) => sum + (s.alpa_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal (untuk riwayat di bawah)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        </div>
        <button onClick={loadData} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-honey">Total Telat: {totalTelat}</span>
          <span className="badge-soft badge-honey">Total Alpa: {totalAlpa}</span>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Akumulasi Poin Pelanggaran per Siswa
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">Kelas</th>
                <th className="font-medium text-right">Total Poin</th>
              </tr>
            </thead>
            <tbody>
              {[...summary].sort((a, b) => b.total_poin - a.total_poin).map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900">{s.user?.name}</td>
                  <td className="text-ink-700">{s.class_room?.name || '-'}</td>
                  <td className="text-right">
                    <span className={`badge-soft ${s.total_poin > 0 ? 'badge-honey' : 'badge-brand'}`}>
                      {s.total_poin} poin
                    </span>
                  </td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada data siswa.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Riwayat Kejadian Pelanggaran {date && <span className="text-ink-500 font-sans font-normal text-sm">— {date}</span>}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Tanggal</th>
              <th className="font-medium">Nama Siswa</th>
              <th className="font-medium">Kelas</th>
              <th className="font-medium">Jenis</th>
              <th className="font-medium text-right">Poin</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((v) => (
              <tr key={v.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-700">{v.date}</td>
                <td className="text-ink-900">{v.student?.user?.name}</td>
                <td className="text-ink-700">{v.student?.class_room?.name || '-'}</td>
                <td>
                  <span className="badge-soft badge-honey">
                    <AlertOctagon className="w-3 h-3 mr-1" />
                    {v.type === 'alpa' ? 'Tidak Hadir' : 'Terlambat'}
                  </span>
                </td>
                <td className="text-right text-ink-700">+{v.poin}</td>
              </tr>
            ))}
            {detail.length === 0 && (
              <tr><td colSpan="5" className="py-6 text-center text-ink-300">Tidak ada riwayat pelanggaran untuk filter ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
