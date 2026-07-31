import { useEffect, useState } from 'react';
import { ClipboardList, User, CheckCircle2, BellRing } from 'lucide-react';
import api from '../../../api/axios';
import PklAttendanceDetailModal from '../../../components/PklAttendanceDetailModal';
import PklJournalModal from '../../../components/PklJournalModal';

export default function DudiAbsensiTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const [attendanceTarget, setAttendanceTarget] = useState(null);
  const [journalTarget, setJournalTarget] = useState(null);

  const loadSiswa = () => {
    setLoading(true);
    return api.get('/dudi/my-siswa').then((res) => setList(res.data)).finally(() => setLoading(false));
  };
  const loadPending = () => {
    setLoadingPending(true);
    return api.get('/dudi/absensi-pending').then((res) => setPending(res.data)).finally(() => setLoadingPending(false));
  };

  useEffect(() => {
    loadSiswa();
    loadPending();
  }, []);

  const handleVerifikasi = async (id) => {
    setVerifyingId(id);
    try {
      await api.post(`/pkl-attendances/${id}/verifikasi`);
      setPending((p) => p.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi absensi.');
    } finally {
      setVerifyingId(null);
    }
  };

  // Yang statusnya sudah "selesai" tidak perlu ditampilkan lagi di sini —
  // halaman ini khusus siswa yang masih aktif PKL.
  const filtered = list.filter((p) => p.status !== 'selesai');

  const pembimbingUnik = [...new Set(
    filtered.map((p) => p.guru_pembimbing?.user?.name).filter(Boolean)
  )];

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <ClipboardList className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Daftar siswa yang sedang/pernah PKL di tempat Anda. Klik <b>Riwayat Absensi</b> untuk memantau kehadiran, atau mengoreksi manual kalau GPS bermasalah.
        </p>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BellRing className="w-4 h-4 text-honey-500" />
          <h2 className="font-display font-semibold text-ink-900">
            Verifikasi Absensi <span className="text-ink-500 font-sans font-normal text-sm">({pending.length} menunggu)</span>
          </h2>
        </div>

        {loadingPending ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
        ) : pending.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Tidak ada absensi yang menunggu verifikasi.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center justify-between border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-ink-900 font-medium truncate">
                    {a.student?.user?.name} <span className="text-ink-400 font-normal">· {a.student?.class_room?.name || '-'}</span>
                  </p>
                  <p className="text-xs text-ink-500">
                    {a.date} · Masuk {a.time_in ? a.time_in.slice(0, 5) : '-'} · Pulang {a.time_out ? a.time_out.slice(0, 5) : '-'}
                  </p>
                </div>
                <button
                  onClick={() => handleVerifikasi(a.id)}
                  disabled={verifyingId === a.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {verifyingId === a.id ? 'Memproses...' : 'Verifikasi'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-ink-900">
            Siswa Magang <span className="text-ink-500 font-sans font-normal text-sm">({filtered.length})</span>
          </h2>
        </div>

        {pembimbingUnik.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-ink-500 mb-4">
            <User className="w-3.5 h-3.5" />
            Pembimbing sekolah: {pembimbingUnik.join(', ')}
          </p>
        )}

        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
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
                  <td className="text-ink-700 text-xs">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setAttendanceTarget(p)}
                        className="text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2 py-1 whitespace-nowrap"
                      >
                        Riwayat Absensi
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
                <tr><td colSpan="3" className="py-6 text-center text-ink-300">Belum ada siswa yang ditempatkan di sini.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {attendanceTarget && (
        <PklAttendanceDetailModal
          placement={attendanceTarget}
          onClose={() => { setAttendanceTarget(null); loadPending(); }}
          canVerify
          showCetak={false}
        />
      )}

      {journalTarget && (
        <PklJournalModal placement={journalTarget} onClose={() => setJournalTarget(null)} canIsiCatatan showCetak={false} />
      )}
    </div>
  );
}
