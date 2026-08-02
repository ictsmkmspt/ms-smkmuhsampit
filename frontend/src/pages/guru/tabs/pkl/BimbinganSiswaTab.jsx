import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import api from '../../../../api/axios';
import PklAttendanceDetailModal from '../../../../components/PklAttendanceDetailModal';
import PklJournalModal from '../../../../components/PklJournalModal';

export default function BimbinganSiswaTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceTarget, setAttendanceTarget] = useState(null);
  const [journalTarget, setJournalTarget] = useState(null);

  const load = () => {
    setLoading(true);
    return api.get('/pkl-placements/my-bimbingan')
      .then((res) => setList(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const aktif = list.filter((p) => p.status !== 'selesai');
  const selesai = list.filter((p) => p.status === 'selesai');

  const TombolAksi = ({ p }) => (
    <div className="flex flex-col gap-1.5 items-stretch">
      <button
        onClick={() => setAttendanceTarget(p)}
        className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap text-center"
      >
        Absensi
      </button>
      <button
        onClick={() => setJournalTarget(p)}
        className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap text-center"
      >
        Jurnal Kegiatan
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Siswa Bimbingan <span className="text-ink-500 font-sans font-normal text-sm">({aktif.length})</span>
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">IDUKA</th>
                <th className="font-medium">Periode</th>
                <th className="pb-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {aktif.map((p) => (
                <tr key={p.id} className="border-t border-line-200">
                  <td className="py-2.5">
                    <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                    <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                  </td>
                  <td className="text-ink-700">{p.dudi?.nama_perusahaan}</td>
                  <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                  <td className="text-right py-2">
                    <TombolAksi p={p} />
                  </td>
                </tr>
              ))}
              {aktif.length === 0 && (
                <tr><td colSpan="4" className="py-6 text-center text-ink-300">Anda belum ditugaskan membimbing siswa PKL.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-ink-400" />
          <h2 className="font-display font-semibold text-ink-900">
            Siswa Selesai PKL <span className="text-ink-500 font-sans font-normal text-sm">({selesai.length})</span>
          </h2>
        </div>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : selesai.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada siswa yang menyelesaikan PKL.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">IDUKA</th>
                <th className="font-medium">Periode</th>
                <th className="pb-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {selesai.map((p) => (
                <tr key={p.id} className="border-t border-line-200">
                  <td className="py-2.5">
                    <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                    <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                  </td>
                  <td className="text-ink-700">{p.dudi?.nama_perusahaan}</td>
                  <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                  <td className="text-right py-2">
                    <TombolAksi p={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {attendanceTarget && (
        <PklAttendanceDetailModal placement={attendanceTarget} onClose={() => setAttendanceTarget(null)} />
      )}

      {journalTarget && (
        <PklJournalModal placement={journalTarget} onClose={() => setJournalTarget(null)} />
      )}
    </div>
  );
}
