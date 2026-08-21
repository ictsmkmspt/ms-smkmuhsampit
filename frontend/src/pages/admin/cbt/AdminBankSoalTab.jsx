import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, FileQuestion, Music, UploadCloud, PenLine, Download, Upload, ChevronLeft, ChevronRight, Folder, Copy, Share2 } from 'lucide-react';
import api from '../../../api/axios';
import RichTextEditor from '../../../components/RichTextEditor';
import TruncateText from '../../../components/TruncateText';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

const PILIHAN_DASAR = ['a', 'b', 'c', 'd'];
const KOSONG = {
  tipe: 'pg', pertanyaan: '',
  pilihan_a: '', pilihan_b: '', pilihan_c: '', pilihan_d: '', pilihan_e: '',
  jawaban_benar: 'A', tingkat_kesulitan: 'sedang',
};
const TINGKAT_LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
const BANK_KOSONG = { nama: '', subject_id: '' };

function AudioDropzone({ audioUrl, audioFile, onPilihFile, onHapus }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onPilihFile(file);
  };

  if (audioFile || audioUrl) {
    return (
      <div className="flex items-center gap-2 border border-line-200 rounded-lg px-3 py-2">
        <Music className="w-4 h-4 text-brand-600 shrink-0" />
        <audio controls src={audioFile ? URL.createObjectURL(audioFile) : audioUrl} className="h-8 flex-1 min-w-0" />
        <button type="button" onClick={onHapus} className="text-ink-300 hover:text-honey-700 shrink-0"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-4 cursor-pointer transition text-xs ${
        dragOver ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line-200 text-ink-400 hover:border-line-300'
      }`}
    >
      <UploadCloud className="w-5 h-5" />
      Seret file audio ke sini atau klik untuk pilih
      <input type="file" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/x-m4a,.mp3,.wav,.ogg,.m4a" onChange={(e) => e.target.files[0] && onPilihFile(e.target.files[0])} className="hidden" />
    </label>
  );
}

// Bank Soal — versi Admin/Waka Kurikulum, item navbar Portal CBT untuk
// GURU yang sudah dipilih (prop teacherId dari CbtAdminPortal). Struktur
// 2 tingkat (Bank Soal → soal di dalamnya) mengikuti BankSoalSubTab.jsx
// (versi guru) apa adanya, cuma endpoint diganti /admin-cbt-bank-soal &
// /admin-cbt-questions (teacher_id eksplisit, tanpa batas kepemilikan).
export default function AdminBankSoalTab({ teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [loadingBank, setLoadingBank] = useState(true);

  const [selectedBank, setSelectedBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState(BANK_KOSONG);
  const [editingBank, setEditingBank] = useState(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [editing, setEditing] = useState(null);
  const [pakaiPilihanE, setPakaiPilihanE] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [hapusAudio, setHapusAudio] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileRef = useRef(null);

  // Duplikat sebagian soal dari 1 Bank Soal jadi Bank Soal baru — untuk
  // guru yang sama (admin sudah punya akses penuh ke bank guru ini,
  // makanya tidak perlu konsep "guru lain" seperti di sisi guru).
  const [duplikatDari, setDuplikatDari] = useState(null);
  const [soalDuplikat, setSoalDuplikat] = useState([]);
  const [loadingSoalDuplikat, setLoadingSoalDuplikat] = useState(false);
  const [soalTerpilih, setSoalTerpilih] = useState(new Set());
  const [showDuplikatForm, setShowDuplikatForm] = useState(false);
  const [namaBankBaru, setNamaBankBaru] = useState('');
  const [duplikatSaving, setDuplikatSaving] = useState(false);
  const [duplikatError, setDuplikatError] = useState('');

  useEffect(() => {
    setSelectedBank(null);
    api.get('/teaching-assignments', { params: { teacher_id: teacherId } }).then((res) => setAssignments(res.data));
  }, [teacherId]);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => { if (a.subject) map.set(a.subject.id, a.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [assignments]);

  const loadBank = () => {
    setLoadingBank(true);
    api.get('/admin-cbt-bank-soal', { params: { teacher_id: teacherId } }).then((res) => setBankList(res.data)).finally(() => setLoadingBank(false));
  };

  useEffect(loadBank, [teacherId]); // eslint-disable-line

  const bankDikelompokkan = useMemo(() => {
    const map = new Map();
    bankList.forEach((b) => {
      const nama = b.subject?.nama || '-';
      if (!map.has(nama)) map.set(nama, []);
      map.get(nama).push(b);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bankList]);

  const loadQuestions = () => {
    if (!selectedBank) return;
    setLoadingQuestions(true);
    api.get('/admin-cbt-questions', { params: { teacher_id: teacherId, bank_id: selectedBank.id } })
      .then((res) => setQuestions(res.data))
      .finally(() => setLoadingQuestions(false));
  };

  useEffect(loadQuestions, [selectedBank]); // eslint-disable-line

  const bukaTambahBank = () => {
    setEditingBank(null);
    setBankForm({ ...BANK_KOSONG, subject_id: subjectOptions[0]?.id ?? '' });
    setBankError('');
    setShowBankForm(true);
  };
  const bukaEditBank = (b) => {
    setEditingBank(b);
    setBankForm({ nama: b.nama, subject_id: b.subject_id });
    setBankError('');
    setShowBankForm(true);
  };
  const simpanBank = async (e) => {
    e.preventDefault();
    setBankError('');
    setBankSaving(true);
    try {
      if (editingBank) {
        await api.put(`/admin-cbt-bank-soal/${editingBank.id}`, { nama: bankForm.nama });
      } else {
        await api.post('/admin-cbt-bank-soal', { ...bankForm, teacher_id: teacherId });
      }
      setShowBankForm(false);
      loadBank();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setBankError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan Bank Soal.');
    } finally {
      setBankSaving(false);
    }
  };
  const hapusBank = async (b) => {
    if (!confirm(`Hapus "${b.nama}"?`)) return;
    try {
      await api.delete(`/admin-cbt-bank-soal/${b.id}`);
      loadBank();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus Bank Soal.');
    }
  };

  const toggleShareBank = async (b) => {
    const pesan = b.dibagikan
      ? `Sembunyikan lagi "${b.nama}" dari guru lain?`
      : `Bagikan "${b.nama}" ke guru lain yang mengajar mapel yang sama?`;
    if (!confirm(pesan)) return;
    try {
      const res = await api.post(`/admin-cbt-bank-soal/${b.id}/toggle-share`);
      alert(res.data.message);
      loadBank();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status berbagi.');
    }
  };

  const bukaDuplikatDari = async (b) => {
    setDuplikatDari(b);
    setSoalTerpilih(new Set());
    setLoadingSoalDuplikat(true);
    try {
      const res = await api.get('/admin-cbt-questions', { params: { teacher_id: teacherId, bank_id: b.id } });
      setSoalDuplikat(res.data);
    } finally {
      setLoadingSoalDuplikat(false);
    }
  };

  const toggleSoalTerpilih = (id) => {
    setSoalTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pilihSemuaSoalDuplikat = () => {
    setSoalTerpilih(soalTerpilih.size === soalDuplikat.length ? new Set() : new Set(soalDuplikat.map((q) => q.id)));
  };

  const bukaDuplikatForm = () => {
    setNamaBankBaru(`Salinan - ${duplikatDari.nama}`);
    setDuplikatError('');
    setShowDuplikatForm(true);
  };

  const simpanDuplikat = async (e) => {
    e.preventDefault();
    setDuplikatError('');
    setDuplikatSaving(true);
    try {
      const res = await api.post('/admin-cbt-bank-soal/duplikat', {
        teacher_id: teacherId,
        bank_id: duplikatDari.id,
        question_ids: [...soalTerpilih],
        nama_bank_baru: namaBankBaru,
      });
      setShowDuplikatForm(false);
      setDuplikatDari(null);
      loadBank();
      alert(res.data.message);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setDuplikatError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menduplikat soal.');
    } finally {
      setDuplikatSaving(false);
    }
  };

  const bukaTambah = () => {
    setEditing(null);
    setForm(KOSONG);
    setPakaiPilihanE(true);
    setAudioFile(null);
    setHapusAudio(false);
    setError('');
    setShowForm(true);
  };

  const bukaEdit = (q) => {
    setEditing(q);
    setForm({
      tipe: q.tipe,
      pertanyaan: q.pertanyaan,
      pilihan_a: q.pilihan_a || '', pilihan_b: q.pilihan_b || '', pilihan_c: q.pilihan_c || '', pilihan_d: q.pilihan_d || '',
      pilihan_e: q.pilihan_e || '',
      jawaban_benar: q.jawaban_benar || 'A',
      tingkat_kesulitan: q.tingkat_kesulitan || 'sedang',
    });
    setPakaiPilihanE(!!q.pilihan_e);
    setAudioFile(null);
    setHapusAudio(false);
    setError('');
    setShowForm(true);
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, bank_id: selectedBank.id };
      if (!pakaiPilihanE) payload.pilihan_e = '';
      if (payload.tipe === 'essay') {
        payload.pilihan_a = payload.pilihan_b = payload.pilihan_c = payload.pilihan_d = payload.pilihan_e = '';
        payload.jawaban_benar = '';
      }

      if (editing) {
        await api.put(`/admin-cbt-questions/${editing.id}`, payload);
        if (audioFile) {
          const fd = new FormData();
          fd.append('audio', audioFile);
          await api.post(`/admin-cbt-questions/${editing.id}/audio`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (hapusAudio) {
          await api.delete(`/admin-cbt-questions/${editing.id}/audio`);
        }
      } else {
        const fd = new FormData();
        fd.append('teacher_id', teacherId);
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        if (audioFile) fd.append('audio', audioFile);
        await api.post('/admin-cbt-questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false);
      loadQuestions();
      loadBank();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan soal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q) => {
    if (!confirm('Hapus soal ini dari bank soal?')) return;
    try {
      await api.delete(`/admin-cbt-questions/${q.id}`);
      loadQuestions();
      loadBank();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus soal.');
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await api.get('/admin-cbt-questions/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_soal.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('teacher_id', teacherId);
    formData.append('bank_id', selectedBank.id);
    formData.append('file', file);

    try {
      const res = await api.post('/admin-cbt-questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      loadQuestions();
      loadBank();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.message || 'Gagal mengimpor soal. Pastikan format file sesuai template.',
        gagal: [],
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const pilihanAktif = [...PILIHAN_DASAR, ...(pakaiPilihanE ? ['e'] : [])];

  // ===== Varian: pilih sebagian soal dari 1 Bank Soal untuk diduplikat
  // jadi Bank Soal baru (guru yang sama) =====
  if (duplikatDari) {
    return (
      <div>
        <button onClick={() => setDuplikatDari(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Bank Soal
        </button>

        <div className="surface-card p-4 mb-4">
          <p className="text-xs text-ink-500">{duplikatDari.subject?.nama}</p>
          <h3 className="font-display font-semibold text-ink-900">{duplikatDari.nama}</h3>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <button onClick={pilihSemuaSoalDuplikat} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            {soalTerpilih.size === soalDuplikat.length && soalDuplikat.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}
          </button>
          <button
            onClick={bukaDuplikatForm}
            disabled={soalTerpilih.size === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-xl px-4 py-2 transition shrink-0"
          >
            <Copy className="w-4 h-4" /> Duplikat ({soalTerpilih.size} Terpilih)
          </button>
        </div>

        <div className="space-y-2">
          {soalDuplikat.map((q) => (
            <label key={q.id} className="surface-card p-4 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={soalTerpilih.has(q.id)} onChange={() => toggleSoalTerpilih(q.id)} className="mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 flex-wrap">
                  <span className={`badge-soft shrink-0 ${q.tipe === 'essay' ? 'bg-honey-50 text-honey-700' : 'bg-brand-50 text-brand-700'}`}>
                    {q.tipe === 'essay' ? 'Essay' : 'PG'} &middot; {TINGKAT_LABEL[q.tingkat_kesulitan] || q.tingkat_kesulitan}
                  </span>
                  {q.audio_url && <Music className="w-3.5 h-3.5 text-brand-600 mt-1 shrink-0" title="Ada audio" />}
                </div>
                <div className="text-sm text-ink-900 mt-1 [&_p]:m-0 [&_img]:max-h-24" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.pertanyaan) }} />
              </div>
            </label>
          ))}
          {!loadingSoalDuplikat && soalDuplikat.length === 0 && (
            <p className="text-center text-sm text-ink-300 py-8">Bank Soal ini masih kosong.</p>
          )}
        </div>

        {showDuplikatForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowDuplikatForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-line-200">
                <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-brand-600" /> Duplikat {soalTerpilih.size} Soal
                </h3>
                <button onClick={() => setShowDuplikatForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={simpanDuplikat} className="p-5 space-y-3">
                {duplikatError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{duplikatError}</p>}
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Nama Bank Soal Baru</label>
                  <input value={namaBankBaru} onChange={(e) => setNamaBankBaru(e.target.value)} className="field-input w-full" required />
                </div>
                <button disabled={duplikatSaving} className="btn-primary w-full justify-center">{duplikatSaving ? 'Menduplikat...' : 'Duplikat Sekarang'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedBank) {
    return (
      <div>
        <button onClick={() => setSelectedBank(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Bank Soal
        </button>

        <div className="surface-card p-4 mb-4">
          <p className="text-xs text-ink-500">{selectedBank.subject?.nama}</p>
          <h3 className="font-display font-semibold text-ink-900">{selectedBank.nama}</h3>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="text-sm text-ink-500">{questions.length} soal</div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setImportResult(null); setShowImport(true); }} className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition">
              <Upload className="w-4 h-4" /> Impor Soal
            </button>
            <button onClick={bukaTambah} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="surface-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 flex-wrap">
                  <span className={`badge-soft shrink-0 ${q.tipe === 'essay' ? 'bg-honey-50 text-honey-700' : 'bg-brand-50 text-brand-700'}`}>
                    {q.tipe === 'essay' ? 'Essay' : 'PG'} &middot; {TINGKAT_LABEL[q.tingkat_kesulitan] || q.tingkat_kesulitan}
                  </span>
                  {q.audio_url && <Music className="w-3.5 h-3.5 text-brand-600 mt-1 shrink-0" title="Ada audio" />}
                </div>
                <div className="text-sm text-ink-900 mt-1 [&_p]:m-0 [&_img]:max-h-24" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.pertanyaan) }} />
                {q.tipe !== 'essay' && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-ink-500">
                    {[...PILIHAN_DASAR, ...(q.pilihan_e ? ['e'] : [])].map((k) => (
                      <div key={k} className={`flex gap-1 [&_p]:m-0 [&_img]:max-h-16 ${q.jawaban_benar === k.toUpperCase() ? 'text-brand-700 font-semibold' : ''}`}>
                        <span>{k.toUpperCase()}.</span>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(q[`pilihan_${k}`]) }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => bukaEdit(q)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(q)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {!loadingQuestions && questions.length === 0 && (
            <p className="text-center text-sm text-ink-300 py-8">Belum ada soal di Bank Soal ini.</p>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
                <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-brand-600" /> {editing ? 'Edit Soal' : 'Tambah Soal'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSimpan} className="p-5 overflow-y-auto space-y-4">
                {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Tipe Soal</label>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setForm({ ...form, tipe: 'pg' })}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border transition ${
                        form.tipe === 'pg' ? 'bg-brand-600 border-brand-600 text-white' : 'border-line-200 text-ink-600 hover:bg-mist-50'
                      }`}
                    >
                      <FileQuestion className="w-3.5 h-3.5" /> Pilihan Ganda
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, tipe: 'essay' })}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border transition ${
                        form.tipe === 'essay' ? 'bg-honey-500 border-honey-500 text-white' : 'border-line-200 text-ink-600 hover:bg-mist-50'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5" /> Essay
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Tingkat Kesulitan</label>
                  <div className="flex gap-1.5">
                    {['mudah', 'sedang', 'sulit'].map((t) => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, tingkat_kesulitan: t })}
                        className={`flex-1 text-sm font-medium rounded-lg px-3 py-2 border transition ${
                          form.tingkat_kesulitan === t ? 'bg-brand-600 border-brand-600 text-white' : 'border-line-200 text-ink-600 hover:bg-mist-50'
                        }`}
                      >
                        {TINGKAT_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Soal</label>
                  <RichTextEditor
                    value={form.pertanyaan}
                    onChange={(html) => setForm({ ...form, pertanyaan: html })}
                    placeholder="Tulis pertanyaan di sini..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">File Audio (opsional)</label>
                  <AudioDropzone
                    audioUrl={!hapusAudio ? editing?.audio_url : null}
                    audioFile={audioFile}
                    onPilihFile={(f) => { setAudioFile(f); setHapusAudio(false); }}
                    onHapus={() => { setAudioFile(null); setHapusAudio(true); }}
                  />
                </div>

                {form.tipe === 'essay' ? (
                  <p className="text-xs text-ink-500 bg-mist-50 border border-line-200 rounded-lg px-3 py-2">
                    Soal essay dikoreksi manual oleh guru lewat menu Koreksi Essay — nilai diberi 0-100, lalu otomatis disesuaikan ke Tingkat Kesulitan di atas saat menghitung skor akhir.
                  </p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-ink-500">Pilihan Jawaban — tandai bulatan yang benar</label>
                      {!pakaiPilihanE ? (
                        <button type="button" onClick={() => setPakaiPilihanE(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                          + Tambah Pilihan E
                        </button>
                      ) : (
                        <button type="button" onClick={() => { setPakaiPilihanE(false); setForm({ ...form, pilihan_e: '', jawaban_benar: form.jawaban_benar === 'E' ? 'A' : form.jawaban_benar }); }} className="text-xs font-medium text-ink-400 hover:text-honey-700">
                          Hapus Pilihan E
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {pilihanAktif.map((k) => (
                        <div key={k} className="flex items-start gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 w-14 shrink-0 pt-2.5">
                            <input
                              type="radio" name="jawaban_benar" checked={form.jawaban_benar === k.toUpperCase()}
                              onChange={() => setForm({ ...form, jawaban_benar: k.toUpperCase() })}
                            />
                            {k.toUpperCase()}
                          </label>
                          <div className="flex-1 min-w-0">
                            <RichTextEditor
                              compact
                              value={form[`pilihan_${k}`]}
                              onChange={(html) => setForm({ ...form, [`pilihan_${k}`]: html })}
                              placeholder={`Pilihan ${k.toUpperCase()}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </form>
            </div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowImport(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
                <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand-600" /> Impor Soal dari Excel
                </h3>
                <button onClick={() => setShowImport(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3">
                <p className="text-xs text-ink-500">Soal akan masuk ke Bank Soal <b>{selectedBank.nama}</b> — unduh templatenya kalau belum punya, isi, lalu unggah kembali.</p>
                <div className="flex gap-2">
                  <button onClick={handleDownloadTemplate} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition">
                    <Download className="w-4 h-4" /> Unduh Template
                  </button>
                  <button
                    onClick={() => importFileRef.current?.click()}
                    disabled={importing}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl px-4 py-2 transition"
                  >
                    <Upload className="w-4 h-4" /> {importing ? 'Mengimpor...' : 'Unggah Excel'}
                  </button>
                  <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
                </div>

                {importResult && (
                  <div className="border-t border-line-200 pt-3">
                    <p className={`text-sm font-medium ${importResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
                      {importResult.message}
                    </p>
                    {importResult.gagal?.length > 0 && (
                      <div className="table-scroll">
                        <table className="w-full text-sm mt-2">
                          <thead>
                            <tr className="text-left text-ink-500 border-b border-line-200">
                              <th className="pb-2 font-medium whitespace-nowrap px-2">Baris</th>
                              <th className="font-medium whitespace-nowrap px-2">Kolom</th>
                              <th className="font-medium whitespace-nowrap px-2">Alasan Gagal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.gagal.map((g, i) => (
                              <tr key={i} className="border-t border-line-200">
                                <td className="py-2 text-ink-900 whitespace-nowrap px-2">{g.baris}</td>
                                <td className="text-ink-700 whitespace-nowrap px-2">{g.kolom}</td>
                                <td className="text-honey-700 whitespace-nowrap px-2"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-ink-500">{bankList.length} Bank Soal</div>
        {subjectOptions.length > 0 && (
          <button onClick={bukaTambahBank} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tambah Bank Soal
          </button>
        )}
      </div>

      {assignments.length === 0 && !loadingBank ? (
        <p className="text-center text-sm text-ink-300 py-8">Guru ini belum punya Tugas Mengajar di tahun ajaran aktif.</p>
      ) : (
        <div className="space-y-5">
          {bankDikelompokkan.map(([mapel, list]) => (
            <div key={mapel}>
              <p className="text-xs font-semibold text-ink-500 mb-2">{mapel}</p>
              <div className="space-y-2">
                {list.map((b) => (
                  <div key={b.id} className="surface-card p-4 flex items-start justify-between gap-3">
                    <button onClick={() => setSelectedBank(b)} className="min-w-0 flex-1 text-left flex items-center gap-2 hover:opacity-80 transition">
                      <Folder className="w-5 h-5 text-brand-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-ink-900 truncate"><TruncateText text={b.nama} /></p>
                          {b.dibagikan && <span className="badge-soft badge-brand shrink-0">Dibagikan</span>}
                        </div>
                        <p className="text-xs text-ink-500 mt-0.5">{b.questions_count} soal</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleShareBank(b)} title={b.dibagikan ? 'Sembunyikan dari guru lain' : 'Bagikan ke guru lain (mapel sama)'} className={b.dibagikan ? 'text-brand-600 hover:text-brand-700' : 'text-ink-300 hover:text-brand-700'}><Share2 className="w-4 h-4" /></button>
                      <button onClick={() => bukaDuplikatDari(b)} title="Duplikat sebagian soal ke Bank Soal baru" className="text-ink-300 hover:text-brand-700"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => bukaEditBank(b)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => hapusBank(b)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!loadingBank && bankList.length === 0 && (
            <p className="text-center text-sm text-ink-300 py-8">Belum ada Bank Soal untuk guru ini.</p>
          )}
        </div>
      )}

      {showBankForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowBankForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">{editingBank ? 'Edit Bank Soal' : 'Tambah Bank Soal'}</h3>
              <button onClick={() => setShowBankForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={simpanBank} className="p-5 space-y-3">
              {bankError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{bankError}</p>}
              {!editingBank && (
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Mata Pelajaran</label>
                  <select value={bankForm.subject_id} onChange={(e) => setBankForm({ ...bankForm, subject_id: e.target.value })} className="field-input" required>
                    <option value="">— Pilih —</option>
                    {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Nama Bank Soal</label>
                <input placeholder="mis. Bank Soal UH 1" value={bankForm.nama} onChange={(e) => setBankForm({ ...bankForm, nama: e.target.value })} className="field-input w-full" required />
              </div>
              <button disabled={bankSaving} className="btn-primary w-full justify-center">{bankSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
