import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, MinusCircle, Hourglass, Maximize, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Huruf tampil buat 1 soal — jumlahnya ikut opsi_map (4 kalau soal cuma
// A-D, 5 kalau ada pilihan E), BUKAN selalu 4 seperti sebelumnya.
const opsiUntukSoal = (q) => (q.opsi_map || []).map((_, idx) => String.fromCharCode(65 + idx));
const TINGKAT_LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };

export default function ExamAttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jawaban, setJawaban] = useState({}); // question_id -> { jawaban_dipilih, jawaban_essay }
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const lastTabEventAt = useRef(0);
  const submittedRef = useRef(false);
  const [gatePassed, setGatePassed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  // Kunci 1-perangkat: token acak yang disimpan localStorage saat attempt
  // dibuat (lihat UjianTab/LatihanTab) — dikirim di tiap request supaya
  // server tahu ini perangkat yang sama dengan yang pertama membuka.
  const deviceToken = localStorage.getItem(`cbt_device_${attemptId}`);

  const load = useCallback(() => {
    return api.get(`/cbt-attempts/${attemptId}`, { params: { device_token: deviceToken } }).then((res) => {
      setData(res.data);
      setRemaining(res.data.remaining_seconds);
      setJawaban(res.data.jawaban || {});
      submittedRef.current = res.data.attempt.status === 'submitted';
    }).catch((err) => {
      setError(err.response?.data?.message || 'Ujian tidak ditemukan.');
    }).finally(() => setLoading(false));
  }, [attemptId, deviceToken]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    // Jawaban esai cuma tersimpan ke server saat textarea-nya di-blur —
    // kalau timer habis SELAGI siswa masih fokus mengetik di textarea itu,
    // teks terakhir belum pernah terkirim. Simpan paksa semua jawaban esai
    // yang ada di state lokal dulu sebelum submit, supaya tidak ada yang
    // hilang di detik-detik terakhir.
    const soalEssay = (data?.questions || []).filter((q) => q.tipe === 'essay');
    await Promise.all(soalEssay.map((q) =>
      api.put(`/cbt-attempts/${attemptId}/answers`, {
        question_id: q.id,
        jawaban_essay: jawaban[q.id]?.jawaban_essay || '',
        device_token: deviceToken,
      }).catch(() => {})
    ));
    try {
      await api.post(`/cbt-attempts/${attemptId}/submit`, { device_token: deviceToken });
    } catch {
      // kalau gagal (mis. sudah keburu tersubmit di server karena waktu habis), tetap lanjut refresh data
    }
    await load();
    setSubmitting(false);
  }, [attemptId, deviceToken, load, data, jawaban]);

  const isLatihan = data?.exam?.tipe === 'latihan';

  // Timer — hitung mundur di layar, tapi sumber kebenaran waktu tetap
  // server (dicek ulang tiap fetch). Begitu 0, submit otomatis sekali.
  // Latihan SEKARANG juga punya durasi sungguhan, sama seperti ujian.
  useEffect(() => {
    if (!data || data.attempt.status !== 'in_progress' || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [data?.attempt.status, remaining <= 0]);

  useEffect(() => {
    if (!data || data.attempt.status !== 'in_progress') return;
    if (remaining <= 0) handleSubmit();
  }, [data, remaining, handleSubmit]);

  // Lockdown — catat kalau siswa pindah tab/aplikasi lain ATAU keluar
  // dari fullscreen selagi mengerjakan (informasi buat guru, bukan
  // pendiskualifikasian otomatis). Berlaku untuk latihan MAUPUN ujian —
  // fullscreen-nya sendiri baru diminta lewat gerbang "Mulai Mengerjakan"
  // (lihat gatePassed) karena browser menolak requestFullscreen() tanpa
  // klik langsung dari pengguna (gagal senyap kalau dipanggil otomatis
  // dari useEffect setelah data selesai dimuat secara async).
  useEffect(() => {
    if (!data || data.attempt.status !== 'in_progress') return;

    const blockEvent = (e) => e.preventDefault();
    const logTabSwitch = (eventType) => {
      const now = Date.now();
      if (now - lastTabEventAt.current < 2000) return; // de-dupe event yang saling susul
      lastTabEventAt.current = now;
      api.post(`/cbt-attempts/${attemptId}/tab-switch`, { event_type: eventType, device_token: deviceToken }).catch(() => {});
    };
    const onVisibility = () => { if (document.hidden) logTabSwitch('visibility_hidden'); };
    const onBlur = () => logTabSwitch('blur');
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) logTabSwitch('fullscreen_exit');
    };
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('paste', blockEvent);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [data, attemptId, deviceToken]);

  const masukFullscreen = () => {
    document.documentElement.requestFullscreen?.()
      .then(() => setIsFullscreen(true))
      .catch(() => {});
    setGatePassed(true);
  };

  // Keluar dari fullscreen begitu ujian selesai (submitted) atau halaman
  // ditinggalkan, supaya siswa tidak "terjebak" fullscreen setelah kelar.
  useEffect(() => {
    if (data?.attempt.status === 'submitted' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [data?.attempt.status]);

  const pilihJawaban = async (questionId, opsi) => {
    setJawaban((j) => ({ ...j, [questionId]: { ...j[questionId], jawaban_dipilih: opsi } }));
    try {
      await api.put(`/cbt-attempts/${attemptId}/answers`, { question_id: questionId, jawaban_dipilih: opsi, device_token: deviceToken });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan jawaban, coba lagi.');
    }
  };

  const ubahEssayLokal = (questionId, teks) => {
    setJawaban((j) => ({ ...j, [questionId]: { ...j[questionId], jawaban_essay: teks } }));
  };

  const simpanEssay = async (questionId) => {
    try {
      await api.put(`/cbt-attempts/${attemptId}/answers`, { question_id: questionId, jawaban_essay: jawaban[questionId]?.jawaban_essay || '', device_token: deviceToken });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan jawaban, coba lagi.');
    }
  };

  if (loading) {
    return <div className="cbt-scope min-h-screen bg-mist-50 flex items-center justify-center text-ink-300 text-sm">Memuat...</div>;
  }

  if (error) {
    return (
      <div className="cbt-scope min-h-screen bg-mist-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-ink-500">{error}</p>
        <button onClick={() => navigate('/ujian')} className="btn-primary">Kembali</button>
      </div>
    );
  }

  const { attempt, exam, questions, review, nilai_dipublikasikan: nilaiDipublikasikan } = data;

  // ===== Tampilan hasil (submitted) =====
  if (attempt.status === 'submitted') {
    return (
      <div className="cbt-scope min-h-screen bg-mist-50 p-6">
        <div className="max-w-md mx-auto">
          {nilaiDipublikasikan ? (
            <div className="surface-card p-5 text-center mb-4">
              <p className="text-xs text-ink-500 mb-1">{exam.nama} · {exam.mapel}</p>
              <p className="cbt-display text-4xl font-bold text-brand-600">{attempt.skor}</p>
              <p className="text-xs text-ink-400 mt-1">dari 100{exam.kkm ? ` · KKM ${exam.kkm}` : ''}</p>
              {exam.kkm != null && (
                <span className={`badge-soft mt-2 ${attempt.skor >= exam.kkm ? 'badge-brand' : 'badge-rose'}`}>
                  {attempt.skor >= exam.kkm ? 'Tuntas' : 'Belum Tuntas'}
                </span>
              )}
            </div>
          ) : (
            <div className="surface-card p-5 text-center mb-4">
              <Hourglass className="w-8 h-8 text-honey-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-ink-900">Jawaban Terkumpul</p>
              <p className="text-xs text-ink-500 mt-1">
                {questions.some((q) => q.tipe === 'essay')
                  ? 'Ada soal essay yang perlu dikoreksi guru dulu — nilai tampil begitu guru mempublikasikannya.'
                  : 'Nilai tampil begitu guru mempublikasikannya.'}
              </p>
            </div>
          )}

          {review ? (
            <div className="surface-card p-4 space-y-3">
              <h2 className="font-semibold text-sm text-ink-900">Pembahasan</h2>
              {questions.map((q, i) => {
                const r = review.find((x) => x.question_id === q.id);
                const opsi = opsiUntukSoal(q);
                return (
                  <div key={q.id} className="border-t border-line-200 pt-3 first:border-t-0 first:pt-0">
                    <div className="text-sm text-ink-900 mb-1.5 [&_p]:m-0 [&_img]:max-h-32">
                      <span>{i + 1}. </span>
                      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.pertanyaan) }} />
                    </div>
                    {q.audio_url && <audio controls src={q.audio_url} className="w-full h-8 mb-2" />}
                    {q.tipe === 'essay' ? (
                      <div>
                        <div className="bg-mist-50 border border-line-200 rounded-lg p-2.5 mb-1.5">
                          <p className="text-xs text-ink-700 whitespace-pre-wrap">{r?.jawaban_essay || <span className="italic text-ink-300">(tidak dijawab)</span>}</p>
                        </div>
                        <p className="text-xs text-ink-500">
                          {r?.status_koreksi === 'sudah'
                            ? <span className="font-semibold text-brand-700">Nilai: {r.nilai_essay}/100</span>
                            : 'Belum dikoreksi guru.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {opsi.map((o) => {
                          const isBenar = r?.jawaban_benar === o;
                          const isDipilih = r?.jawaban_dipilih === o;
                          return (
                            <div key={o} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg mb-1 ${
                              isBenar ? 'bg-brand-50 text-brand-700' : isDipilih ? 'bg-rose-50 text-rose-700' : 'text-ink-500'
                            }`}>
                              {isBenar ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : isDipilih ? <XCircle className="w-3.5 h-3.5 shrink-0" /> : <MinusCircle className="w-3.5 h-3.5 shrink-0 opacity-0" />}
                              <span>{o}. </span>
                              <span className="[&_p]:inline [&_p]:m-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q[`pilihan_${o.toLowerCase()}`]) }} />
                            </div>
                          );
                        })}
                        {!r && <p className="text-xs text-ink-400 italic">Tidak dijawab.</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-ink-400 py-4">Pembahasan akan tampil setelah guru menutup ujian ini.</p>
          )}

          <button onClick={() => navigate('/ujian')} className="btn-primary w-full justify-center mt-4">Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  // ===== Gerbang layar penuh — harus diklik (gestur nyata) supaya
  // requestFullscreen() dikabulkan browser; tampil untuk latihan MAUPUN
  // ujian. =====
  if (!gatePassed) {
    return (
      <div className="cbt-scope min-h-screen bg-mist-50 flex items-center justify-center p-6">
        <div className="surface-card p-6 max-w-sm text-center">
          <Maximize className="w-8 h-8 text-brand-600 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-ink-900 mb-1.5">{isLatihan ? 'Mulai Latihan' : 'Mulai Ujian'}</h2>
          <p className="text-sm text-ink-500 mb-4">
            {exam.nama} dikerjakan dalam mode layar penuh. Jangan keluar dari layar penuh atau berpindah tab/aplikasi lain selama mengerjakan — aktivitas ini tercatat untuk guru.
          </p>
          <button onClick={masukFullscreen} className="btn-primary w-full justify-center">Mulai Mengerjakan</button>
        </div>
      </div>
    );
  }

  // ===== Tampilan mengerjakan (in_progress) =====
  const q = questions[current];
  const opsi = opsiUntukSoal(q);
  const terjawabCount = questions.filter((qq) => jawaban[qq.id]?.jawaban_dipilih || jawaban[qq.id]?.jawaban_essay).length;

  return (
    <div className="cbt-scope min-h-screen bg-mist-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-line-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-500">Soal {current + 1} / {questions.length}</p>
          <p className="text-sm font-semibold text-ink-900">{exam.nama}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${remaining < 60 ? 'bg-rose-50 text-rose-700' : 'bg-mist-50 text-ink-700'}`}>
          <Clock className="w-4 h-4" /> {formatTime(remaining)}
        </div>
      </div>

      {!isFullscreen && (
        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Anda keluar dari layar penuh
          </p>
          <button onClick={masukFullscreen} className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-2.5 py-1 shrink-0">
            Kembali ke Layar Penuh
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="surface-card p-4 mb-4">
          {q.tipe === 'essay' && (
            <span className="badge-soft bg-honey-50 text-honey-700 border border-honey-200 mb-2">Essay &middot; {TINGKAT_LABEL[q.tingkat_kesulitan] || q.tingkat_kesulitan}</span>
          )}
          <div
            className="text-sm text-ink-900 mb-3 select-none [&_p]:m-0 [&_img]:max-h-48"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.pertanyaan) }}
          />
          {q.audio_url && <audio key={q.id} controls src={q.audio_url} className="w-full h-9 mb-4" />}

          {q.tipe === 'essay' ? (
            <textarea
              key={q.id}
              value={jawaban[q.id]?.jawaban_essay || ''}
              onChange={(e) => ubahEssayLokal(q.id, e.target.value)}
              onBlur={() => simpanEssay(q.id)}
              placeholder="Tulis jawaban Anda di sini..."
              rows={6}
              className="field-input w-full text-sm"
            />
          ) : (
            <div className="space-y-2">
              {opsi.map((o, idx) => {
                // q.pilihan_a..d(e) sudah datang teracak dari server;
                // opsi_map menyimpan huruf ASLI di tiap posisi tampilan,
                // supaya yang dikirim/dibandingkan ke server tetap
                // konsisten walau urutan tampil beda-beda antar siswa.
                const actual = q.opsi_map?.[idx] ?? o;
                const isSel = jawaban[q.id]?.jawaban_dipilih === actual;
                return (
                  <button
                    key={o}
                    onClick={() => pilihJawaban(q.id, actual)}
                    className={`w-full flex items-start gap-2.5 text-left text-sm px-3 py-2.5 rounded-xl border transition ${
                      isSel ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-200 text-ink-700 hover:bg-mist-50'
                    }`}
                  >
                    <span className={`font-semibold shrink-0 ${isSel ? 'text-brand-700' : 'text-ink-400'}`}>{o}.</span>
                    <span className="[&_p]:inline [&_p]:m-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q[`pilihan_${o.toLowerCase()}`]) }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex-1 text-sm font-medium text-ink-700 bg-white border border-line-200 rounded-xl py-2.5 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            disabled={current === questions.length - 1}
            className="flex-1 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5 disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>

        <div className="surface-card p-4 mb-4">
          <p className="text-xs font-medium text-ink-500 mb-2">Navigasi Soal · {terjawabCount}/{questions.length} terjawab</p>
          <div className="grid grid-cols-8 gap-1.5">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={`aspect-square rounded-md text-xs font-mono font-semibold flex items-center justify-center transition ${
                  i === current ? 'ring-2 ring-brand-700' : ''
                } ${(jawaban[qq.id]?.jawaban_dipilih || jawaban[qq.id]?.jawaban_essay) ? 'bg-brand-600 text-white' : 'bg-mist-50 text-ink-400 border border-line-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (confirm('Kumpulkan ujian sekarang? Jawaban yang belum diisi akan dianggap kosong.')) handleSubmit(); }}
          disabled={submitting}
          className="btn-primary w-full justify-center"
        >
          {submitting ? 'Mengumpulkan...' : 'Selesai & Kumpulkan'}
        </button>
      </div>
    </div>
  );
}
