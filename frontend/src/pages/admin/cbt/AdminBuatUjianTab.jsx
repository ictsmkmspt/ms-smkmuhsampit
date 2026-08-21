import { useEffect, useMemo, useState } from 'react';
import { Plus, X, ClipboardEdit, Play, Square, Trash2, Users, Copy, CopyPlus, RefreshCw, Megaphone, OctagonX, Pencil, RotateCcw, CalendarClock } from 'lucide-react';
import api from '../../../api/axios';
import { stripHtml } from '../../../utils/sanitizeHtml';

const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formKosong = () => {
  const mulai = new Date();
  const selesai = new Date(mulai.getTime() + 60 * 60 * 1000);
  return {
    subject_id: '', class_room_ids: [],
    nama: '', durasi_menit: 60, kkm: '', tipe: 'ujian',
    jadwal_mulai: toLocalInput(mulai), jadwal_selesai: toLocalInput(selesai),
    question_ids: [], materi_id: '',
  };
};

const rentangLebarLatihan = () => {
  const mulai = new Date();
  const selesai = new Date(mulai);
  selesai.setFullYear(selesai.getFullYear() + 5);
  return { jadwal_mulai: toLocalInput(mulai), jadwal_selesai: toLocalInput(selesai) };
};

const STATUS_BADGE = {
  draft: 'badge-soft bg-mist-50 text-ink-500 border border-line-200',
  terbuka: 'badge-soft badge-brand',
  selesai: 'badge-soft badge-honey',
};
const STATUS_LABEL = { draft: 'Draf', terbuka: 'Terbuka', selesai: 'Selesai' };
const TIPE_BADGE = {
  ujian: 'badge-soft bg-mist-50 text-ink-700 border border-line-200',
  latihan: 'badge-soft bg-honey-50 text-honey-700 border border-honey-200',
};
const TIPE_LABEL = { ujian: 'Ujian', latihan: 'Latihan' };

const formatTanggalJadwal = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatJamJadwal = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Buat Ujian — versi Admin/Waka Kurikulum untuk guru yang dipilih di
// navbar Portal CBT (teacherId dari CbtAdminPortal). Mengikuti
// BuatUjianSubTab.jsx (versi guru) apa adanya, cuma endpoint diganti
// /admin-cbt-exams (teacher_id eksplisit, tanpa batas kepemilikan — lihat
// AdminCbtExamController).
export default function AdminBuatUjianTab({ teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bankQuestions, setBankQuestions] = useState([]);
  const [materiOptions, setMateriOptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formKosong());
  const [editingExam, setEditingExam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [viewingExam, setViewingExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [totalSoalViewing, setTotalSoalViewing] = useState(0);

  useEffect(() => {
    setSubjectFilter('');
    setClassFilter('');
    api.get('/teaching-assignments', { params: { teacher_id: teacherId } }).then((res) => setAssignments(res.data));
    api.get('/admin-cbt-materi', { params: { teacher_id: teacherId } }).then((res) => setMateriOptions(res.data));
  }, [teacherId]);

  const materiOptionsForSubject = useMemo(
    () => materiOptions.filter((m) => m.subject_id === Number(form.subject_id)),
    [materiOptions, form.subject_id]
  );

  const bankQuestionsDikelompokkan = useMemo(() => {
    const map = new Map();
    bankQuestions.forEach((q) => {
      const nama = q.bank?.nama || 'Belum dikelompokkan';
      if (!map.has(nama)) map.set(nama, []);
      map.get(nama).push(q);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bankQuestions]);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => { if (a.subject) map.set(a.subject.id, a.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [assignments]);

  const classOptionsFor = (subjectId) => {
    const map = new Map();
    assignments
      .filter((a) => !subjectId || a.subject_id === Number(subjectId))
      .forEach((a) => { if (a.class_room) map.set(a.class_room.id, a.class_room); });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  const classFilterOptions = useMemo(() => classOptionsFor(subjectFilter), [assignments, subjectFilter]); // eslint-disable-line
  const classFormOptions = useMemo(() => classOptionsFor(form.subject_id), [assignments, form.subject_id]); // eslint-disable-line

  useEffect(() => {
    if (classFilter && !classFilterOptions.some((c) => c.id === Number(classFilter))) {
      setClassFilter('');
    }
  }, [subjectFilter, classFilterOptions]); // eslint-disable-line

  const loadExams = () => {
    setLoading(true);
    api.get('/admin-cbt-exams', { params: { teacher_id: teacherId } }).then((res) => setAllExams(res.data)).finally(() => setLoading(false));
  };

  useEffect(loadExams, [teacherId]); // eslint-disable-line

  const exams = useMemo(() => allExams.filter((ex) => {
    if (subjectFilter && ex.subject_id !== Number(subjectFilter)) return false;
    if (classFilter && !ex.class_rooms?.some((c) => c.id === Number(classFilter))) return false;
    return true;
  }), [allExams, subjectFilter, classFilter]);

  const bukaForm = () => {
    setEditingExam(null);
    setForm({ ...formKosong(), subject_id: subjectFilter, class_room_ids: classFilter ? [Number(classFilter)] : [] });
    setBankQuestions([]);
    setError('');
    setShowForm(true);
  };

  const bukaEdit = async (exam) => {
    setEditingExam(exam);
    setError('');
    setShowForm(true);
    setBankQuestions([]);
    const res = await api.get(`/admin-cbt-exams/${exam.id}`);
    const detail = res.data;
    setForm({
      subject_id: String(detail.subject_id),
      class_room_ids: detail.class_rooms.map((c) => c.id),
      nama: detail.nama,
      durasi_menit: detail.durasi_menit,
      kkm: detail.kkm ?? '',
      tipe: detail.tipe,
      jadwal_mulai: toLocalInput(new Date(detail.jadwal_mulai)),
      jadwal_selesai: toLocalInput(new Date(detail.jadwal_selesai)),
      question_ids: detail.exam_questions.map((eq) => eq.question_id),
      materi_id: detail.materi?.id ?? '',
    });
  };

  const toggleClassRoom = (id) => {
    setForm((f) => ({
      ...f,
      class_room_ids: f.class_room_ids.includes(id) ? f.class_room_ids.filter((x) => x !== id) : [...f.class_room_ids, id],
    }));
  };

  useEffect(() => {
    if (!showForm || !form.subject_id) { setBankQuestions([]); return; }
    api.get('/admin-cbt-questions', { params: { teacher_id: teacherId, subject_id: form.subject_id } }).then((res) => setBankQuestions(res.data));
  }, [showForm, form.subject_id, teacherId]);

  const toggleQuestion = (id) => {
    setForm((f) => ({
      ...f,
      question_ids: f.question_ids.includes(id) ? f.question_ids.filter((x) => x !== id) : [...f.question_ids, id],
    }));
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.subject_id || form.class_room_ids.length === 0) {
      setError('Pilih mata pelajaran dan minimal 1 kelas dulu.');
      return;
    }
    if (form.question_ids.length === 0) {
      setError('Pilih minimal 1 soal dari bank soal.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, teacher_id: teacherId };
      if (payload.tipe === 'latihan') {
        Object.assign(payload, rentangLebarLatihan());
      }
      if (editingExam) {
        await api.put(`/admin-cbt-exams/${editingExam.id}`, payload);
      } else {
        await api.post('/admin-cbt-exams', payload);
      }
      setShowForm(false);
      setEditingExam(null);
      loadExams();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan ujian.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (exam) => {
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/publish`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan ujian.');
    }
  };

  const handleClose = async (exam) => {
    if (!confirm(`Tutup ujian "${exam.nama}"? Siswa tidak bisa mengerjakan lagi setelah ini.`)) return;
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/close`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menutup ujian.');
    }
  };

  const handleDelete = async (exam) => {
    const pesan = exam.attempts_count > 0
      ? `Hapus ujian "${exam.nama}"? Ujian ini SUDAH DIKERJAKAN ${exam.attempts_count} siswa — semua jawaban & skor mereka akan ikut terhapus PERMANEN dan tidak bisa dikembalikan.`
      : `Hapus ujian "${exam.nama}"?`;
    if (!confirm(pesan)) return;
    try {
      await api.delete(`/admin-cbt-exams/${exam.id}`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus ujian.');
    }
  };

  const handleReopen = async (exam) => {
    if (!confirm(`Buka kembali ujian "${exam.nama}"? Siswa bisa mulai/melanjutkan mengerjakan lagi. Nilai yang sudah dipublikasikan akan disembunyikan lagi sampai dipublikasikan ulang.`)) return;
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/reopen`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuka kembali ujian.');
    }
  };

  const handleDuplicate = async (exam) => {
    if (!confirm(`Duplikat "${exam.nama}"? Salinan baru akan dibuat dengan soal & kelas yang sama.`)) return;
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/duplicate`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menduplikat ujian.');
    }
  };

  const handleRegenerateToken = async (exam) => {
    if (!confirm(`Ganti token ujian "${exam.nama}"? Token lama tidak akan berlaku lagi (siswa yang sudah join tidak terpengaruh).`)) return;
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/regenerate-token`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengganti token.');
    }
  };

  const handlePublikasiNilai = async (exam) => {
    if (!confirm(`Publikasikan nilai "${exam.nama}"? Siswa akan bisa langsung lihat skor & pembahasannya.`)) return;
    try {
      await api.post(`/admin-cbt-exams/${exam.id}/publikasi-nilai`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mempublikasikan nilai.');
    }
  };

  const handleHentikanSemua = async (exam) => {
    if (!confirm(`Paksa-hentikan SEMUA sesi siswa yang masih mengerjakan "${exam.nama}"? Jawaban yang sudah tersimpan akan langsung difinalisasi.`)) return;
    try {
      const res = await api.post(`/admin-cbt-exams/${exam.id}/hentikan-semua`);
      alert(res.data.message);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghentikan sesi.');
    }
  };

  const bukaAttempts = async (exam) => {
    setViewingExam(exam);
    const res = await api.get(`/admin-cbt-exams/${exam.id}/attempts`);
    setAttempts(res.data.attempts);
    setTotalSoalViewing(res.data.total_soal);
  };

  const handleHentikanAttempt = async (attempt) => {
    if (!confirm(`Paksa-hentikan sesi ${attempt.student?.user?.name}? Jawaban yang sudah tersimpan akan langsung difinalisasi.`)) return;
    await api.post(`/admin-cbt-exams/attempts/${attempt.id}/hentikan`);
    bukaAttempts(viewingExam);
  };

  const copyToken = (token) => {
    navigator.clipboard?.writeText(token);
  };

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
              {classFilterOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-ink-500">{exams.length} ujian</div>
        {subjectOptions.length > 0 && (
          <button onClick={bukaForm} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Buat Ujian
          </button>
        )}
      </div>

      <div className="space-y-2">
        {exams.map((ex) => (
          <div key={ex.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-ink-900">{ex.nama}</p>
                  <span className={TIPE_BADGE[ex.tipe]}>{TIPE_LABEL[ex.tipe]}</span>
                </div>
                <p className="text-xs text-ink-500 mt-0.5">
                  {ex.subject?.nama} &middot; {ex.class_rooms?.map((c) => c.name).join(', ')} &middot; {ex.exam_questions_count} soal · {ex.durasi_menit} menit{ex.kkm ? ` · KKM ${ex.kkm}` : ''} · {ex.attempts_count} kali dikerjakan{ex.materi ? ` · Materi: ${ex.materi.judul}` : ''}
                </p>
                {ex.tipe === 'ujian' && (
                  <p className="flex items-center gap-1 text-xs text-ink-500 mt-0.5">
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    {formatTanggalJadwal(ex.jadwal_mulai)}, {formatJamJadwal(ex.jadwal_mulai)}–{formatJamJadwal(ex.jadwal_selesai)}
                    {formatTanggalJadwal(ex.jadwal_mulai) !== formatTanggalJadwal(ex.jadwal_selesai) ? ` (s.d. ${formatTanggalJadwal(ex.jadwal_selesai)})` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => bukaEdit(ex)} title="Edit ujian" className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDuplicate(ex)} title="Duplikat" className="text-ink-300 hover:text-brand-700"><CopyPlus className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(ex)} title="Hapus" className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                </div>
                <span className={STATUS_BADGE[ex.status]}>{STATUS_LABEL[ex.status]}</span>
                {ex.tipe === 'ujian' && ex.status === 'selesai' && (
                  <span className={`badge-soft ${ex.status_publikasi ? 'badge-brand' : 'bg-mist-50 text-ink-500 border border-line-200'}`}>
                    {ex.status_publikasi ? 'Nilai terbit' : 'Nilai belum terbit'}
                  </span>
                )}
              </div>
            </div>

            {ex.tipe === 'ujian' && (
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => copyToken(ex.token)}
                  title="Salin token"
                  className="flex items-center gap-1.5 font-mono text-xs tracking-widest bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1 text-ink-700 hover:bg-mist-100 transition"
                >
                  {ex.token} <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleRegenerateToken(ex)}
                  title="Ganti token"
                  className="text-ink-300 hover:text-brand-600 p-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {ex.tipe === 'latihan' && ex.status === 'draft' && (
                <button onClick={() => handlePublish(ex)} className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition">
                  <Play className="w-3.5 h-3.5" /> Terbitkan
                </button>
              )}
              {ex.tipe === 'latihan' && ex.status === 'terbuka' && (
                <button onClick={() => handleClose(ex)} className="flex items-center gap-1 text-xs font-medium text-honey-700 bg-honey-100 hover:brightness-95 rounded-lg px-3 py-1.5 transition">
                  <Square className="w-3.5 h-3.5" /> Tutup Ujian
                </button>
              )}
              {ex.tipe === 'ujian' && ex.status === 'terbuka' && (
                <button onClick={() => handleHentikanSemua(ex)} className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg px-3 py-1.5 transition">
                  <OctagonX className="w-3.5 h-3.5" /> Hentikan Semua Sesi
                </button>
              )}
              {ex.tipe === 'ujian' && ex.status === 'selesai' && !ex.status_publikasi && (
                <button onClick={() => handlePublikasiNilai(ex)} className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition">
                  <Megaphone className="w-3.5 h-3.5" /> Publikasikan Nilai
                </button>
              )}
              {ex.status === 'selesai' && (
                <button onClick={() => handleReopen(ex)} className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg px-3 py-1.5 transition">
                  <RotateCcw className="w-3.5 h-3.5" /> Buka Kembali
                </button>
              )}
              <button onClick={() => bukaAttempts(ex)} className="flex items-center gap-1 text-xs font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-lg px-3 py-1.5 transition">
                <Users className="w-3.5 h-3.5" /> Peserta
              </button>
            </div>
          </div>
        ))}
        {!loading && exams.length === 0 && (
          <p className="text-center text-sm text-ink-300 py-8">
            {subjectFilter || classFilter ? 'Tidak ada ujian yang cocok dengan saringan ini.' : 'Belum ada ujian dibuat untuk guru ini.'}
          </p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => { setShowForm(false); setEditingExam(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
                <ClipboardEdit className="w-4 h-4 text-brand-600" /> {editingExam ? 'Edit Ujian' : 'Buat Ujian'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingExam(null); }} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSimpan} className="p-5 overflow-y-auto space-y-3">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              {editingExam?.attempts_count > 0 && (
                <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">
                  Ujian ini sudah dikerjakan {editingExam.attempts_count} siswa — mengubah soal/durasi/jadwal sekarang bisa membuat pengerjaan yang sudah berjalan jadi tidak konsisten. Lanjutkan hanya kalau memang perlu memperbaiki kesalahan.
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Mata Pelajaran</label>
                {editingExam ? (
                  <p className="field-input bg-mist-50 text-ink-500">{subjectOptions.find((s) => String(s.id) === form.subject_id)?.nama || '-'}</p>
                ) : (
                  <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value, class_room_ids: [], question_ids: [], materi_id: '' })} className="field-input" required>
                    <option value="">— Pilih —</option>
                    {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Kelas ({form.class_room_ids.length} dipilih — boleh lebih dari 1)</label>
                {!form.subject_id ? (
                  <p className="text-xs text-ink-300 py-2">Pilih mata pelajaran dulu.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {classFormOptions.map((c) => (
                      <button
                        key={c.id} type="button"
                        onClick={() => toggleClassRoom(c.id)}
                        className={`text-xs font-medium rounded-lg px-3 py-1.5 border transition ${
                          form.class_room_ids.includes(c.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-line-200 text-ink-600 hover:bg-mist-50'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Tipe</label>
                <div className={`flex gap-1 bg-mist-50 border border-line-200 rounded-xl p-1 w-fit ${editingExam ? 'opacity-60' : ''}`}>
                  {['ujian', 'latihan'].map((t) => (
                    <button
                      key={t} type="button" disabled={!!editingExam}
                      onClick={() => setForm({ ...form, tipe: t })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                        form.tipe === t ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-white'
                      } ${editingExam ? 'cursor-not-allowed' : ''}`}
                    >
                      {TIPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-400 mt-1">
                  {editingExam
                    ? 'Tipe tidak bisa diubah setelah dibuat.'
                    : form.tipe === 'ujian'
                    ? 'Pakai token, punya jadwal & batas waktu, 1× kesempatan per siswa.'
                    : 'Tanpa token (langsung tampil di menu Latihan siswa), tanpa jadwal & batas waktu, boleh dikerjakan berkali-kali.'}
                </p>
              </div>

              <input placeholder={form.tipe === 'ujian' ? 'Nama ujian (mis. UH Bab 3)' : 'Nama latihan (mis. Latihan Subnetting)'} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input w-full" required />

              {form.tipe === 'latihan' && (
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Lampirkan ke Materi (opsional)</label>
                  <select value={form.materi_id} onChange={(e) => setForm({ ...form, materi_id: e.target.value })} className="field-input text-ink-700">
                    <option value="">— Tidak dilampirkan —</option>
                    {materiOptionsForSubject.map((m) => <option key={m.id} value={m.id}>{m.judul}</option>)}
                  </select>
                  {form.subject_id && materiOptionsForSubject.length === 0 && (
                    <p className="text-xs text-ink-400 mt-1">Belum ada materi untuk mapel ini pada guru ini.</p>
                  )}
                  <p className="text-xs text-ink-400 mt-1">Latihan ini akan tampil juga di halaman detail materi yang dipilih.</p>
                </div>
              )}

              {/* Durasi & KKM sekarang berlaku SAMA untuk ujian & latihan
                  (latihan sekarang juga punya batas waktu pengerjaan
                  sungguhan) — yang beda cuma latihan tidak punya jadwal,
                  jadi Mulai/Selesai cuma ditampilkan untuk ujian. */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Durasi (menit)</label>
                    <input type="number" min="5" max="300" value={form.durasi_menit} onChange={(e) => setForm({ ...form, durasi_menit: e.target.value })} className="field-input w-full" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">KKM (opsional)</label>
                    <input type="number" min="0" max="100" placeholder="mis. 75" value={form.kkm} onChange={(e) => setForm({ ...form, kkm: e.target.value })} className="field-input w-full" />
                  </div>
                </div>
                {form.tipe === 'ujian' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1">Mulai</label>
                      <input type="datetime-local" value={form.jadwal_mulai} onChange={(e) => setForm({ ...form, jadwal_mulai: e.target.value })} className="field-input w-full min-w-0" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1">Selesai</label>
                      <input type="datetime-local" value={form.jadwal_selesai} onChange={(e) => setForm({ ...form, jadwal_selesai: e.target.value })} className="field-input w-full min-w-0" required />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Pilih Soal dari Bank Soal ({form.question_ids.length} dipilih)</label>
                <div className="border border-line-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {bankQuestionsDikelompokkan.map(([bankNama, list]) => (
                    <div key={bankNama} className="divide-y divide-line-200">
                      <p className="text-xs font-semibold text-ink-500 bg-mist-50 px-3 py-1.5">{bankNama}</p>
                      {list.map((q) => (
                        <label key={q.id} className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-mist-50">
                          <input type="checkbox" checked={form.question_ids.includes(q.id)} onChange={() => toggleQuestion(q.id)} className="mt-1" />
                          <span className="text-ink-900">{stripHtml(q.pertanyaan)}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                  {form.subject_id && bankQuestions.length === 0 && (
                    <p className="text-sm text-ink-300 text-center py-6">Bank soal mapel ini masih kosong untuk guru ini.</p>
                  )}
                  {!form.subject_id && (
                    <p className="text-sm text-ink-300 text-center py-6">Pilih mata pelajaran dulu untuk lihat bank soalnya.</p>
                  )}
                </div>
              </div>

              <button disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Menyimpan...' : editingExam ? 'Simpan Perubahan' : form.tipe === 'ujian' ? 'Simpan Ujian' : 'Simpan sebagai Draf'}
              </button>
              {!editingExam && form.tipe === 'ujian' && (
                <p className="text-xs text-ink-400 text-center">Ujian langsung aktif sesuai jadwal Mulai/Selesai yang diisi — tidak perlu diterbitkan manual.</p>
              )}
              {!editingExam && form.tipe === 'latihan' && (
                <p className="text-xs text-ink-400 text-center">Latihan tersimpan sebagai draf dulu — tekan &ldquo;Terbitkan&rdquo; di daftar supaya siswa bisa mengakses.</p>
              )}
            </form>
          </div>
        </div>
      )}

      {viewingExam && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setViewingExam(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900">{viewingExam.nama}</h3>
              <button onClick={() => setViewingExam(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-line-200">
              {attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink-900 truncate">{a.student?.user?.name}</p>
                    <p className="text-xs text-ink-500">
                      {a.status === 'submitted'
                        ? `Selesai · ${a.tab_switch_count > 0 ? `${a.tab_switch_count}× pindah tab` : 'tidak pindah tab'}`
                        : `Mengerjakan · ${a.answers_count}/${totalSoalViewing} terjawab`}
                    </p>
                  </div>
                  {a.status === 'submitted' ? (
                    <span className="font-semibold text-ink-900 shrink-0">{a.skor}</span>
                  ) : (
                    <button onClick={() => handleHentikanAttempt(a)} className="text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 shrink-0">
                      Hentikan
                    </button>
                  )}
                </div>
              ))}
              {attempts.length === 0 && (
                <p className="text-sm text-ink-300 text-center py-8">Belum ada siswa yang mengerjakan.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
