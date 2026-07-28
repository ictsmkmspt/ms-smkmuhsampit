import { useEffect, useState } from 'react';
import { LogOut, Building2, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import PklAttendanceDetailModal from '../../components/PklAttendanceDetailModal';

export default function DudiDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [attendanceTarget, setAttendanceTarget] = useState(null);

  const loadProfile = () => api.get('/my-dudi-profile').then((res) => setProfile(res.data));
  const loadSiswa = () => {
    setLoading(true);
    return api.get('/dudi/my-siswa').then((res) => setList(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
    loadSiswa();
  }, []);

  const filtered = filterStatus ? list.filter((p) => p.status === filterStatus) : list;

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="bg-white border-b border-line-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-ink-500">DUDI</p>
              <h1 className="font-display text-lg font-semibold text-ink-900">{profile?.nama_perusahaan || user.name}</h1>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 pb-10 space-y-6">
        <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
          <ClipboardList className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700">
            Daftar siswa yang sedang/pernah PKL di tempat Anda. Klik <b>Riwayat Absensi</b> untuk memantau kehadiran, atau mengoreksi manual kalau GPS bermasalah.
          </p>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink-900">
              Siswa Magang <span className="text-ink-500 font-sans font-normal text-sm">({filtered.length})</span>
            </h2>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="field-input text-sm text-ink-700 w-40">
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium">Nama Siswa</th>
                  <th className="font-medium">Pembimbing Sekolah</th>
                  <th className="font-medium">Periode</th>
                  <th className="font-medium">Status</th>
                  <th className="pb-2 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-line-200">
                    <td className="py-2.5">
                      <p className="text-ink-900 font-medium">{p.student?.user?.name}</p>
                      <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                    </td>
                    <td className="text-ink-700">{p.guru_pembimbing?.user?.name || '-'}</td>
                    <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                    <td>
                      <span className={`badge-soft ${p.status === 'aktif' ? 'badge-brand' : 'badge-soft'}`}>
                        {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setAttendanceTarget(p)}
                        className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
                      >
                        Riwayat Absensi
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300">Belum ada siswa yang ditempatkan di sini.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {attendanceTarget && (
        <PklAttendanceDetailModal placement={attendanceTarget} onClose={() => setAttendanceTarget(null)} canVerify />
      )}
    </div>
  );
}
