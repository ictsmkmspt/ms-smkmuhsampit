import { useEffect, useState } from 'react';
import { Monitor, Eye, ChevronLeft, Radio, OctagonX, TimerReset } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import CbtProfilMenu from './CbtProfilMenu';
import NotificationBell from '../../components/NotificationBell';
import TruncateText from '../../components/TruncateText';

const POLL_MS = 5000;
const TIPE_BADGE = {
  ujian: 'badge-soft bg-mist-50 text-ink-700 border border-line-200',
  latihan: 'badge-soft bg-honey-50 text-honey-700 border border-honey-200',
};
const TIPE_LABEL = { ujian: 'Ujian', latihan: 'Latihan' };

// Portal Pengawas Ujian — cuma 1 fungsi (memantau semua ujian/latihan yang
// sedang berlangsung lintas guru/mapel/kelas), jadi tidak perlu NAV
// bertingkat seperti CbtGuruPortal/CbtSiswaPortal. Kontrolnya SENGAJA
// dibatasi ke Hentikan & Tambah Waktu saja (kontrol darurat) — Reset
// (menghapus jawaban) dan Koreksi Essay tetap wewenang guru pemilik ujian.
function PengawasContent() {
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [totalSoal, setTotalSoal] = useState(0);
  const [attempts, setAttempts] = useState([]);

  const loadExams = () => {
    setLoading(true);
    api.get('/pengawas/ujian-aktif').then((res) => setAllExams(res.data)).finally(() => setLoading(false));
  };

  useEffect(loadExams, []);

  const bukaExam = (ex) => {
    setExam(ex);
    setAttempts([]);
  };

  const refreshAttempts = () => {
    if (!exam) return;
    api.get(`/pengawas/ujian/${exam.id}/attempts`).then((res) => {
      setTotalSoal(res.data.total_soal);
      setAttempts(res.data.attempts);
    });
  };

  useEffect(() => {
    if (!exam) return;
    refreshAttempts();
    const id = setInterval(refreshAttempts, POLL_MS);
    return () => clearInterval(id);
  }, [exam]); // eslint-disable-line

  const handleHentikan = async (attempt) => {
    if (!confirm(`Paksa-hentikan sesi ${attempt.student?.user?.name}? Jawaban yang sudah tersimpan akan langsung difinalisasi.`)) return;
    try {
      await api.post(`/pengawas/attempts/${attempt.id}/hentikan`);
      refreshAttempts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghentikan sesi.');
    }
  };

  const handleTambahWaktu = async (attempt) => {
    const input = prompt(`Tambah berapa menit untuk sesi ${attempt.student?.user?.name}?`, '10');
    if (input === null) return;
    const menit = Number(input);
    if (!Number.isInteger(menit) || menit < 1) {
      alert('Masukkan jumlah menit berupa bilangan bulat positif.');
      return;
    }
    try {
      await api.post(`/pengawas/attempts/${attempt.id}/tambah-waktu`, { menit });
      refreshAttempts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah waktu.');
    }
  };

  const sedangMengerjakan = attempts.filter((a) => a.status === 'in_progress').length;
  const sudahSelesai = attempts.filter((a) => a.status === 'submitted').length;

  if (exam) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setExam(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
        </button>

        <div className="surface-card p-4 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-semibold text-ink-900">{exam.nama}</h3>
            <span className={TIPE_BADGE[exam.tipe]}>{TIPE_LABEL[exam.tipe]}</span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            {exam.subject?.nama} &middot; {exam.class_rooms?.map((c) => c.name).join(', ')} &middot; diampu {exam.teacher?.user?.name}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE — diperbarui tiap 5 detik
          </span>
          <span className="text-xs text-ink-400 ml-auto">{sedangMengerjakan} mengerjakan &middot; {sudahSelesai} selesai</span>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Siswa</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Status</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Progres</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Pindah Tab</th>
                  <th className="pb-2 pt-3 font-medium text-right whitespace-nowrap px-2">Skor</th>
                  <th className="pb-2 pt-3 pr-4 font-medium text-right whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-t border-line-200">
                    <td className="py-2.5 pl-4 text-ink-900 whitespace-nowrap px-2"><TruncateText text={a.student?.user?.name} /></td>
                    <td className="whitespace-nowrap px-2">
                      <span className={`badge-soft ${a.status === 'submitted' ? 'badge-brand' : 'badge-honey'}`}>
                        {a.status === 'submitted' ? 'Selesai' : 'Mengerjakan'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 text-ink-700">{a.answers_count}/{totalSoal}</td>
                    <td className="whitespace-nowrap px-2">
                      {a.tab_switch_count > 0 ? <span className="text-honey-700 font-medium">{a.tab_switch_count}×</span> : <span className="text-ink-300">&mdash;</span>}
                    </td>
                    <td className="text-right whitespace-nowrap px-2 font-semibold text-ink-900">{a.status === 'submitted' ? a.skor : '—'}</td>
                    <td className="pr-4 text-right whitespace-nowrap px-2">
                      {a.status === 'in_progress' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleTambahWaktu(a)} title="Tambah waktu tanpa menghapus jawaban" className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg px-2.5 py-1 transition">
                            <TimerReset className="w-3.5 h-3.5" /> +Waktu{a.extra_minutes > 0 ? ` (${a.extra_minutes}')` : ''}
                          </button>
                          <button onClick={() => handleHentikan(a)} title="Hentikan sesi" className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg px-2.5 py-1 transition">
                            <OctagonX className="w-3.5 h-3.5" /> Hentikan
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr><td colSpan="6" className="py-8 text-center text-ink-300 whitespace-nowrap px-2">Belum ada siswa yang membuka ujian ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      {allExams.map((ex) => (
        <button key={ex.id} onClick={() => bukaExam(ex)} className="w-full surface-card p-4 flex items-start justify-between gap-3 text-left hover:bg-mist-50 transition">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-ink-900">{ex.nama}</p>
              <span className={TIPE_BADGE[ex.tipe]}>{TIPE_LABEL[ex.tipe]}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700"><Radio className="w-3 h-3 animate-pulse" /> Live</span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              {ex.subject?.nama} &middot; {ex.class_rooms?.map((c) => c.name).join(', ')} &middot; diampu {ex.teacher?.user?.name} &middot; {ex.exam_questions_count} soal &middot; {ex.attempts_count} peserta
            </p>
          </div>
        </button>
      ))}
      {!loading && allExams.length === 0 && (
        <p className="text-center text-sm text-ink-300 py-8">Tidak ada ujian/latihan yang sedang berlangsung saat ini.</p>
      )}
    </div>
  );
}

export default function CbtPengawasPortal() {
  const { user } = useAuth();
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="cbt-scope min-h-screen bg-mist-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-[#0B1B3A] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-[#F2B705]" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide">Portal CBT &middot; Pengawas</p>
            <p className="cbt-display text-sm font-semibold text-white">{user.name}</p>
          </div>
        </div>
        <NotificationBell />
        <CbtProfilMenu role="pengawas" />
      </div>

      <aside className="hidden md:flex md:w-56 md:flex-col bg-[#0B1B3A] text-white p-4 shrink-0">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Monitor className="w-5 h-5 text-[#F2B705]" />
          <span className="cbt-display font-bold text-sm">Portal CBT</span>
        </div>
        <p className="text-[10px] uppercase tracking-wide text-white/35 font-semibold mb-2 px-2">Menu</p>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white">
          <Eye className="w-4 h-4 shrink-0" /> Pengawasan
        </div>
        <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold shrink-0">{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-white/40">Pengawas Ujian</p>
          </div>
          <NotificationBell />
          <CbtProfilMenu role="pengawas" openUpward />
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-6 w-full">
        <h2 className="cbt-display text-lg font-bold text-ink-900 mb-4 text-center md:text-left max-w-4xl mx-auto md:mx-0">Pengawasan Ujian Aktif</h2>
        <PengawasContent />
      </main>
    </div>
  );
}
