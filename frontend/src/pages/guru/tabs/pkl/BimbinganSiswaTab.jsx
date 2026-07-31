import { useEffect, useState } from 'react';
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

  const filtered = list.filter((p) => p.status !== 'selesai');

  return (
    <div className="surface-card p-5">
      <h2 className="font-display font-semibold text-ink-900 mb-4">
        Siswa Bimbingan <span className="text-ink-500 font-sans font-normal text-sm">({filtered.length})</span>
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
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5">
                  <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                  <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                </td>
                <td className="text-ink-700">{p.dudi?.nama_perusahaan}</td>
                <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setAttendanceTarget(p)}
                      className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2 py-1 whitespace-nowrap"
                    >
                      Absensi
                    </button>
                    <button
                      onClick={() => setJournalTarget(p)}
                      className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2 py-1 whitespace-nowrap"
                    >
                      Jurnal Kegiatan
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300">Anda belum ditugaskan membimbing siswa PKL.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {attendanceTarget && (
        <PklAttendanceDetailModal placement={attendanceTarget} onClose={() => setAttendanceTarget(null)} />
      )}

      {journalTarget && (
        <PklJournalModal placement={journalTarget} onClose={() => setJournalTarget(null)} />
      )}
    </div>
  );
}
