import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Radio, RotateCcw, OctagonX, PenLine, X, CheckCircle2, TimerReset, Download, Send } from 'lucide-react';
import api from '../../../../api/axios';
import CategoryBarChart from '../../../../components/CategoryBarChart';
import TruncateText from '../../../../components/TruncateText';
import { sanitizeHtml, stripHtml } from '../../../../utils/sanitizeHtml';

const POLL_MS = 5000;

const WARNA_BAIK = '#15803D';
const WARNA_SEDANG = '#D9A52A';
const WARNA_KURANG = '#B9504F';
const labelKesukaran = (p) => (p >= 0.7 ? 'Mudah' : p >= 0.3 ? 'Sedang' : 'Sukar');
const warnaKesukaran = (p) => (p >= 0.7 ? WARNA_BAIK : p >= 0.3 ? WARNA_SEDANG : WARNA_KURANG);
const labelDayaBeda = (d) => (d >= 0.4 ? 'Baik Sekali' : d >= 0.3 ? 'Baik' : d >= 0.2 ? 'Cukup' : 'Jelek');
const warnaDayaBeda = (d) => (d >= 0.3 ? WARNA_BAIK : d >= 0.2 ? WARNA_SEDANG : WARNA_KURANG);

const TIPE_BADGE = {
  ujian: 'badge-soft bg-mist-50 text-ink-700 border border-line-200',
  latihan: 'badge-soft bg-honey-50 text-honey-700 border border-honey-200',
};
const TIPE_LABEL = { ujian: 'Ujian', latihan: 'Latihan' };
const TINGKAT_LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };

// Koreksi Essay dulunya menu sendiri, sekarang cuma tombol yang dibuka
// dari dalam Laporan 1 ujian tertentu (mengikuti alur referensi cbtv145:
// tombol "Koreksi Esai" ada di halaman detail laporan, bukan menu terpisah).
function EssayModal({ exam, onClose, onNilaiTersimpan }) {
  const [siswaList, setSiswaList] = useState([]);
  const [totalEssay, setTotalEssay] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [jawabanList, setJawabanList] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [nilaiInput, setNilaiInput] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadSiswa = () => {
    setLoading(true);
    api.get(`/cbt-essay/${exam.id}/koreksi`).then((res) => {
      setSiswaList(res.data.siswa);
      setTotalEssay(res.data.total_essay);
    }).finally(() => setLoading(false));
  };

  useEffect(loadSiswa, [exam.id]); // eslint-disable-line

  const bukaSiswa = async (attemptRow) => {
    setSelectedAttempt(attemptRow);
    const res = await api.get(`/cbt-essay/${exam.id}/koreksi/${attemptRow.attempt_id}`);
    setJawabanList(res.data.jawaban);
    setStudentInfo(res.data.student);
    setNilaiInput(Object.fromEntries(res.data.jawaban.map((j) => [j.id, j.nilai_essay ?? ''])));
  };

  const simpanNilai = async (jawabanId) => {
    const nilai = Number(nilaiInput[jawabanId]);
    if (Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
      alert('Nilai harus antara 0 dan 100.');
      return;
    }
    setSavingId(jawabanId);
    try {
      await api.put(`/cbt-essay/jawaban/${jawabanId}/nilai`, { nilai });
      setJawabanList((prev) => prev.map((j) => (j.id === jawabanId ? { ...j, nilai_essay: nilai, status_koreksi: 'sudah' } : j)));
      loadSiswa();
      onNilaiTersimpan();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan nilai.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
          <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
            <PenLine className="w-4 h-4 text-honey-600" /> Koreksi Essay
          </h3>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {selectedAttempt ? (
            <div>
              <button onClick={() => setSelectedAttempt(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
                <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Siswa
              </button>
              <div className="surface-card p-3 mb-3">
                <p className="text-sm font-semibold text-ink-900">{studentInfo?.user?.name}</p>
                <p className="text-xs text-ink-500">{studentInfo?.class_room?.name} &middot; NIS {studentInfo?.nis}</p>
              </div>
              <div className="space-y-3">
                {jawabanList.map((j, idx) => (
                  <div key={j.id} className="surface-card p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-xs font-semibold text-ink-500">Soal {idx + 1} &middot; {TINGKAT_LABEL[j.tingkat_kesulitan] || j.tingkat_kesulitan}</p>
                      {j.status_koreksi === 'sudah' && (
                        <span className="badge-soft badge-brand flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sudah dinilai</span>
                      )}
                    </div>
                    <div className="text-sm text-ink-900 mb-2 [&_p]:m-0 [&_img]:max-h-32" dangerouslySetInnerHTML={{ __html: sanitizeHtml(j.pertanyaan) }} />
                    {j.audio_url && <audio controls src={j.audio_url} className="w-full h-8 mb-2" />}
                    <div className="bg-mist-50 border border-line-200 rounded-lg p-3 mb-3">
                      <p className="text-[11px] font-medium text-ink-500 mb-1">Jawaban Siswa</p>
                      <p className="text-sm text-ink-700 whitespace-pre-wrap">{j.jawaban_essay || <span className="italic text-ink-300">(tidak dijawab)</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" max="100"
                        value={nilaiInput[j.id] ?? ''}
                        onChange={(e) => setNilaiInput({ ...nilaiInput, [j.id]: e.target.value })}
                        placeholder="0-100"
                        className="field-input w-24"
                      />
                      <button
                        onClick={() => simpanNilai(j.id)}
                        disabled={savingId === j.id}
                        className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                      >
                        {savingId === j.id ? 'Menyimpan...' : 'Simpan Nilai'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {siswaList.map((s) => (
                <button
                  key={s.attempt_id}
                  onClick={() => bukaSiswa(s)}
                  className="w-full surface-card p-3 flex items-center justify-between gap-3 text-left hover:bg-mist-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{s.student?.user?.name}</p>
                    <p className="text-xs text-ink-500">{s.student?.class_room?.name} &middot; {s.sudah_dinilai}/{totalEssay} essay dinilai</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.selesai_dikoreksi ? (
                      <span className="badge-soft badge-brand">Selesai</span>
                    ) : (
                      <span className="badge-soft badge-honey">Belum lengkap</span>
                    )}
                    <span className="text-sm font-semibold text-ink-900">{s.skor}</span>
                  </div>
                </button>
              ))}
              {!loading && siswaList.length === 0 && <p className="text-center text-sm text-ink-300 py-8">Belum ada siswa yang submit.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LaporanSubTab() {
  const [assignments, setAssignments] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [exam, setExam] = useState(null); // ujian yang lagi dibuka detailnya
  const [totalSoal, setTotalSoal] = useState(0);
  const [attempts, setAttempts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [showEssay, setShowEssay] = useState(false);

  useEffect(() => {
    api.get('/my-teaching-assignments').then((res) => setAssignments(res.data));
  }, []);

  const loadExams = () => {
    setLoading(true);
    api.get('/my-cbt-exams').then((res) => setAllExams(res.data)).finally(() => setLoading(false));
  };

  useEffect(loadExams, []);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => { if (a.subject) map.set(a.subject.id, a.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [assignments]);

  const classOptions = useMemo(() => {
    const map = new Map();
    assignments
      .filter((a) => !subjectFilter || a.subject_id === Number(subjectFilter))
      .forEach((a) => { if (a.class_room) map.set(a.class_room.id, a.class_room); });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, subjectFilter]);

  // Cuma ujian/latihan yang sudah dikerjakan minimal 1 siswa yang masuk
  // Laporan — persis alur referensi ("daftar paket soal yang telah
  // dikerjakan oleh siswa").
  const exams = useMemo(() => allExams.filter((ex) => {
    if (ex.attempts_count === 0) return false;
    if (subjectFilter && ex.subject_id !== Number(subjectFilter)) return false;
    if (classFilter && !ex.class_rooms?.some((c) => c.id === Number(classFilter))) return false;
    return true;
  }), [allExams, subjectFilter, classFilter]);

  const bukaExam = (ex) => {
    setExam(ex);
    setAttempts([]);
    setAnalysis(null);
  };

  // Status siswa (Monitoring) + Skor (Nilai) digabung jadi satu tabel —
  // live-poll cuma selama ujiannya masih 'terbuka', statis begitu 'selesai'.
  useEffect(() => {
    if (!exam) return;
    let cancelled = false;
    const fetchAttempts = () => {
      api.get(`/cbt-exams/${exam.id}/attempts`).then((res) => {
        if (cancelled) return;
        setTotalSoal(res.data.total_soal);
        setAttempts(res.data.attempts);
      });
    };
    fetchAttempts();
    if (exam.status !== 'terbuka') return;
    const id = setInterval(fetchAttempts, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [exam]);

  useEffect(() => {
    if (!exam) return;
    api.get(`/cbt-exams/${exam.id}/item-analysis`).then((res) => setAnalysis(res.data));
  }, [exam]);

  const refreshAttempts = () => {
    if (!exam) return;
    api.get(`/cbt-exams/${exam.id}/attempts`).then((res) => {
      setTotalSoal(res.data.total_soal);
      setAttempts(res.data.attempts);
    });
  };

  const handleReset = async (attempt) => {
    if (!confirm(`Reset sesi "${attempt.student?.user?.name}"? Jawaban yang sudah diisi akan hilang dan timer mulai ulang dari 0.`)) return;
    setResetting(attempt.id);
    try {
      await api.post(`/cbt-exams/attempts/${attempt.id}/reset`);
      refreshAttempts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset sesi.');
    } finally {
      setResetting(null);
    }
  };

  const handleHentikan = async (attempt) => {
    if (!confirm(`Paksa-hentikan sesi ${attempt.student?.user?.name}? Jawaban yang sudah tersimpan akan langsung difinalisasi.`)) return;
    await api.post(`/cbt-exams/attempts/${attempt.id}/hentikan`);
    refreshAttempts();
  };

  // Beda dari Reset — ini TIDAK menghapus jawaban, cuma menambah waktu
  // pengerjaan. Dipakai kalau ada gangguan (listrik padam, laptop
  // restart, koneksi putus) supaya siswa dapat kompensasi waktu tanpa
  // kehilangan jawaban yang sudah tersimpan.
  const handleTambahWaktu = async (attempt) => {
    const input = prompt(`Tambah berapa menit untuk sesi ${attempt.student?.user?.name}?`, '10');
    if (input === null) return;
    const menit = Number(input);
    if (!Number.isInteger(menit) || menit < 1) {
      alert('Masukkan jumlah menit berupa bilangan bulat positif.');
      return;
    }
    try {
      await api.post(`/cbt-exams/attempts/${attempt.id}/tambah-waktu`, { menit });
      refreshAttempts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah waktu.');
    }
  };

  const handleExportExcel = () => {
    // Bukan lewat axios (yang sudah pasang Authorization header via
    // interceptor) — file Excel diunduh via <a> baru bakal ikut kirim
    // token kalau session-nya cookie-based, jadi tetap pakai api client
    // yang sama supaya token Sanctum ikut terkirim, cuma responseType-nya
    // diubah jadi blob.
    api.get(`/cbt-exams/${exam.id}/export-nilai`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nilai_${exam.nama}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  };

  const handleKirimNilaiAkademik = async () => {
    if (!confirm(`Kirim nilai "${exam.nama}" ke Nilai Akademik? SEMUA siswa di kelas ini akan tercatat — yang belum mengerjakan tetap masuk dengan skor 0 (bukan dilewati). Kalau sudah pernah dikirim sebelumnya, nilainya akan ditimpa dengan yang terbaru (bukan dobel).`)) return;
    try {
      const res = await api.post(`/cbt-exams/${exam.id}/kirim-nilai-akademik`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim nilai ke Nilai Akademik.');
    }
  };

  const kesukaranCategories = useMemo(() => {
    if (!analysis) return [];
    return analysis.questions.map((q) => ({ name: `Soal ${q.urutan}`, value: Math.round(q.difficulty * 100), color: warnaKesukaran(q.difficulty) }));
  }, [analysis]);

  const dayaBedaCategories = useMemo(() => {
    if (!analysis) return [];
    return analysis.questions.map((q) => ({ name: `Soal ${q.urutan}`, value: Math.round(((q.discrimination + 1) / 2) * 100), color: warnaDayaBeda(q.discrimination) }));
  }, [analysis]);

  const sedangMengerjakan = attempts.filter((a) => a.status === 'in_progress').length;
  const sudahSelesai = attempts.filter((a) => a.status === 'submitted').length;
  const submittedSkor = attempts.filter((a) => a.status === 'submitted').map((a) => Number(a.skor));
  const rataRata = submittedSkor.length ? (submittedSkor.reduce((s, v) => s + v, 0) / submittedSkor.length).toFixed(1) : '—';
  // Ketuntasan KKM — cuma dihitung kalau ujiannya memang diisi KKM.
  const jumlahTuntas = exam?.kkm != null ? submittedSkor.filter((s) => s >= exam.kkm).length : null;
  const persenTuntas = jumlahTuntas !== null && submittedSkor.length ? Math.round((jumlahTuntas / submittedSkor.length) * 100) : null;

  // ===== Level 2: detail 1 ujian =====
  if (exam) {
    return (
      <div>
        <button onClick={() => setExam(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Laporan
        </button>

        <div className="surface-card p-4 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-semibold text-ink-900">{exam.nama}</h3>
            <span className={TIPE_BADGE[exam.tipe]}>{TIPE_LABEL[exam.tipe]}</span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            {exam.subject?.nama} &middot; {exam.class_rooms?.map((c) => c.name).join(', ')}{exam.kkm ? ` · KKM ${exam.kkm}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {exam.has_essay && (
            <button onClick={() => setShowEssay(true)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-honey-500 hover:bg-honey-700 rounded-lg px-3 py-1.5 transition">
              <PenLine className="w-3.5 h-3.5" /> Koreksi Essay
            </button>
          )}
          {sudahSelesai > 0 && (
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-lg px-3 py-1.5 transition">
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}
          {(exam.tipe === 'latihan' || exam.status_publikasi) && (
            <button onClick={handleKirimNilaiAkademik} className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition">
              <Send className="w-3.5 h-3.5" /> Kirim ke Nilai Akademik
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {exam.status === 'terbuka' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE — diperbarui tiap 5 detik
            </span>
          )}
          <span className="text-xs text-ink-400 ml-auto">
            {sedangMengerjakan} mengerjakan &middot; {sudahSelesai} selesai &middot; rata-rata {rataRata}
            {persenTuntas !== null && <> &middot; <span className={persenTuntas >= 50 ? 'text-brand-700 font-medium' : 'text-honey-700 font-medium'}>{jumlahTuntas}/{submittedSkor.length} tuntas KKM ({persenTuntas}%)</span></>}
          </span>
        </div>

        <div className="surface-card overflow-hidden mb-5">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'in_progress' && (
                          <>
                            <button onClick={() => handleTambahWaktu(a)} title="Tambah waktu tanpa menghapus jawaban" className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg px-2.5 py-1 transition">
                              <TimerReset className="w-3.5 h-3.5" /> +Waktu{a.extra_minutes > 0 ? ` (${a.extra_minutes}')` : ''}
                            </button>
                            <button onClick={() => handleReset(a)} disabled={resetting === a.id} title="Reset sesi (menghapus jawaban)" className="flex items-center gap-1 text-xs font-medium text-honey-700 bg-honey-100 hover:brightness-95 disabled:opacity-50 rounded-lg px-2.5 py-1 transition">
                              <RotateCcw className="w-3.5 h-3.5" /> {resetting === a.id ? '...' : 'Reset'}
                            </button>
                            <button onClick={() => handleHentikan(a)} title="Hentikan sesi" className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg px-2.5 py-1 transition">
                              <OctagonX className="w-3.5 h-3.5" /> Hentikan
                            </button>
                          </>
                        )}
                      </div>
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

        <h3 className="font-display font-semibold text-ink-900 mb-3">Analisis Butir Soal</h3>
        {!analysis ? (
          <p className="text-center text-sm text-ink-300 py-8">Memuat...</p>
        ) : analysis.n === 0 ? (
          <p className="text-center text-sm text-ink-300 py-8">Belum ada siswa yang mengumpulkan ujian ini.</p>
        ) : analysis.questions.length === 0 ? (
          <p className="text-center text-sm text-ink-300 py-8">Ujian ini cuma berisi soal essay — analisis butir soal cuma berlaku untuk pilihan ganda.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Dihitung dari <b className="text-ink-900">{analysis.n}</b> siswa yang sudah mengumpulkan · kelompok atas/bawah masing-masing <b className="text-ink-900">{analysis.group_size}</b> siswa.
            </p>
            <CategoryBarChart title="Tingkat Kesukaran" subtitle="Persentase siswa yang menjawab benar per soal — makin tinggi, makin mudah soalnya" categories={kesukaranCategories} showTableToggle />
            <CategoryBarChart title="Daya Beda" subtitle="Seberapa jelas soal ini memisahkan siswa pintar dari yang belum paham (dinormalisasi ke 0–100, 50 = netral)" categories={dayaBedaCategories} showTableToggle />
            <div className="surface-card overflow-hidden">
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-line-200">
                      <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Soal</th>
                      <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Kesukaran</th>
                      <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Daya Beda</th>
                      <th className="pb-2 pt-3 pr-4 font-medium whitespace-nowrap px-2">Nilai Mentah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.questions.map((q) => (
                      <tr key={q.id} className="border-t border-line-200">
                        <td className="py-2.5 pl-4 whitespace-nowrap px-2">
                          <p className="text-ink-900 font-medium">Soal {q.urutan}</p>
                          <p className="text-xs text-ink-500 max-w-xs truncate">{stripHtml(q.pertanyaan)}</p>
                        </td>
                        <td className="whitespace-nowrap px-2">
                          <span className="badge-soft" style={{ backgroundColor: `${warnaKesukaran(q.difficulty)}22`, color: warnaKesukaran(q.difficulty) }}>{labelKesukaran(q.difficulty)}</span>
                        </td>
                        <td className="whitespace-nowrap px-2">
                          <span className="badge-soft" style={{ backgroundColor: `${warnaDayaBeda(q.discrimination)}22`, color: warnaDayaBeda(q.discrimination) }}>{labelDayaBeda(q.discrimination)}</span>
                        </td>
                        <td className="pr-4 whitespace-nowrap px-2 font-mono text-xs text-ink-500">p={q.difficulty} · d={q.discrimination}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {analysis.n < 10 && (
              <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">
                Baru {analysis.n} siswa yang mengumpulkan — daya beda belum terlalu bisa diandalkan untuk kelompok sekecil ini.
              </p>
            )}
          </div>
        )}

        {showEssay && (
          <EssayModal exam={exam} onClose={() => setShowEssay(false)} onNilaiTersimpan={refreshAttempts} />
        )}
      </div>
    );
  }

  // ===== Level 1: daftar ujian/latihan yang sudah dikerjakan =====
  return (
    <div>
      <div className="surface-card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Saring Mata Pelajaran</label>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="field-input text-ink-700 text-sm">
              <option value="">Semua Mapel</option>
              {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Saring Kelas</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="field-input text-ink-700 text-sm">
              <option value="">Semua Kelas</option>
              {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {exams.map((ex) => (
          <button key={ex.id} onClick={() => bukaExam(ex)} className="w-full surface-card p-4 flex items-start justify-between gap-3 text-left hover:bg-mist-50 transition">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-ink-900">{ex.nama}</p>
                <span className={TIPE_BADGE[ex.tipe]}>{TIPE_LABEL[ex.tipe]}</span>
                {ex.status === 'terbuka' && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700"><Radio className="w-3 h-3 animate-pulse" /> Live</span>
                )}
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                {ex.subject?.nama} &middot; {ex.class_rooms?.map((c) => c.name).join(', ')} &middot; {ex.exam_questions_count} soal &middot; {ex.attempts_count} peserta
              </p>
            </div>
          </button>
        ))}
        {!loading && exams.length === 0 && (
          <p className="text-center text-sm text-ink-300 py-8">
            {subjectFilter || classFilter ? 'Tidak ada ujian/latihan yang cocok dengan saringan ini.' : 'Belum ada ujian/latihan yang dikerjakan siswa.'}
          </p>
        )}
      </div>
    </div>
  );
}
