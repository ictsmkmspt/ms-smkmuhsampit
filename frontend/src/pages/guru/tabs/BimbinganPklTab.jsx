import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import api from '../../../api/axios';
import PklAttendanceDetailModal from '../../../components/PklAttendanceDetailModal';

export default function BimbinganPklTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    return api.get('/pkl-placements/my-bimbingan')
      .then((res) => setList(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Briefcase className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Siswa yang Anda bimbing selama PKL. Klik nama siswa untuk melihat riwayat absensi radiusnya, atau mengoreksi manual kalau ada kendala GPS.
        </p>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Siswa Bimbingan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">DUDI</th>
                <th className="font-medium">Periode</th>
                <th className="font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-line-200">
                  <td className="py-2.5">
                    <button
                      onClick={() => setSelected(p)}
                      className="text-ink-900 font-medium hover:text-brand-600 hover:underline transition text-left"
                    >
                      {p.student?.user?.name}
                    </button>
                    <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                  </td>
                  <td className="text-ink-700">{p.dudi?.nama_perusahaan}</td>
                  <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                  <td className="text-right">
                    <span className={`badge-soft ${p.status === 'aktif' ? 'badge-brand' : 'badge-soft'}`}>
                      {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan="4" className="py-6 text-center text-ink-300">Anda belum ditugaskan membimbing siswa PKL.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <PklAttendanceDetailModal placement={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
