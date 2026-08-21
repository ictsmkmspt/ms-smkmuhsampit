import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, BookOpen, Eye, ImagePlus, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import api from '../../../../api/axios';
import RichTextEditor from '../../../../components/RichTextEditor';

const TP_KOSONG = { judul: '', subject_id: '' };
const MATERI_KOSONG = { judul: '', isi: '', status: 'draft' };

// Struktur 2 tingkat: Tujuan Pembelajaran (TP) dulu per mapel, baru Materi
// ditulis di dalam TP itu — mengikuti struktur Kurikulum Merdeka. Materi
// TERPISAH dari LMS Gamifikasi (XP/level/misi) yang sengaja tidak
// dipasang lagi, ini murni artikel + gambar sampul buat siswa baca.
export default function MateriSubTab() {
  const [assignments, setAssignments] = useState([]);
  const [tpList, setTpList] = useState([]);
  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTp, setSelectedTp] = useState(null);

  const [showTpForm, setShowTpForm] = useState(false);
  const [tpForm, setTpForm] = useState(TP_KOSONG);
  const [editingTp, setEditingTp] = useState(null);

  const [showMateriForm, setShowMateriForm] = useState(false);
  const [materiForm, setMateriForm] = useState(MATERI_KOSONG);
  const [editingMateri, setEditingMateri] = useState(null);
  const [gambarFile, setGambarFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/my-teaching-assignments').then((res) => setAssignments(res.data));
  }, []);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => { if (a.subject) map.set(a.subject.id, a.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [assignments]);

  const loadTp = () => {
    setLoading(true);
    api.get('/cbt-tp').then((res) => setTpList(res.data)).finally(() => setLoading(false));
  };
  const loadMateri = () => {
    api.get('/cbt-materi').then((res) => setMateriList(res.data));
  };

  useEffect(() => { loadTp(); loadMateri(); }, []);

  const tpDikelompokkan = useMemo(() => {
    const map = new Map();
    tpList.forEach((tp) => {
      const nama = tp.subject?.nama || '-';
      if (!map.has(nama)) map.set(nama, []);
      map.get(nama).push(tp);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tpList]);

  const materiDalamTp = useMemo(
    () => (selectedTp ? materiList.filter((m) => m.tp_id === selectedTp.id) : []),
    [materiList, selectedTp]
  );

  // ===== TP =====
  const bukaTambahTp = () => {
    setEditingTp(null);
    setTpForm({ ...TP_KOSONG, subject_id: subjectOptions[0]?.id ?? '' });
    setError('');
    setShowTpForm(true);
  };
  const bukaEditTp = (tp) => {
    setEditingTp(tp);
    setTpForm({ judul: tp.judul, subject_id: tp.subject_id });
    setError('');
    setShowTpForm(true);
  };
  const simpanTp = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingTp) {
        await api.put(`/cbt-tp/${editingTp.id}`, { judul: tpForm.judul });
      } else {
        await api.post('/cbt-tp', tpForm);
      }
      setShowTpForm(false);
      loadTp();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan TP.');
    } finally {
      setSaving(false);
    }
  };
  const hapusTp = async (tp) => {
    if (!confirm(`Hapus TP "${tp.judul}"?`)) return;
    try {
      await api.delete(`/cbt-tp/${tp.id}`);
      loadTp();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus TP.');
    }
  };

  // ===== Materi (di dalam 1 TP) =====
  const bukaTambahMateri = () => {
    setEditingMateri(null);
    setMateriForm(MATERI_KOSONG);
    setGambarFile(null);
    setError('');
    setShowMateriForm(true);
  };
  const bukaEditMateri = (m) => {
    setEditingMateri(m);
    setMateriForm({ judul: m.judul, isi: m.isi, status: m.status });
    setGambarFile(null);
    setError('');
    setShowMateriForm(true);
  };
  const simpanMateri = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...materiForm, tp_id: selectedTp.id };
      if (editingMateri) {
        await api.put(`/cbt-materi/${editingMateri.id}`, payload);
        if (gambarFile) {
          const fd = new FormData();
          fd.append('gambar', gambarFile);
          await api.post(`/cbt-materi/${editingMateri.id}/gambar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        if (gambarFile) fd.append('gambar', gambarFile);
        await api.post('/cbt-materi', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowMateriForm(false);
      loadMateri();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan materi.');
    } finally {
      setSaving(false);
    }
  };
  const hapusMateri = async (m) => {
    if (!confirm(`Hapus materi "${m.judul}"?`)) return;
    try {
      await api.delete(`/cbt-materi/${m.id}`);
      loadMateri();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus materi.');
    }
  };

  // ===== Level 2: daftar Materi di dalam 1 TP =====
  if (selectedTp) {
    return (
      <div>
        <button onClick={() => setSelectedTp(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar TP
        </button>

        <div className="surface-card p-4 mb-4">
          <p className="text-xs text-ink-500">{selectedTp.subject?.nama}</p>
          <h3 className="font-display font-semibold text-ink-900">{selectedTp.judul}</h3>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm text-ink-500">{materiDalamTp.length} materi</div>
          <button onClick={bukaTambahMateri} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tulis Materi
          </button>
        </div>

        <div className="space-y-2">
          {materiDalamTp.map((m) => (
            <div key={m.id} className="surface-card p-4 flex items-start gap-3">
              {m.gambar_url ? (
                <img src={m.gambar_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-mist-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-ink-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-ink-900 truncate">{m.judul}</p>
                  <span className={`badge-soft ${m.status === 'terbit' ? 'badge-brand' : 'bg-mist-50 text-ink-500 border border-line-200'}`}>
                    {m.status === 'terbit' ? 'Terbit' : 'Draf'}
                  </span>
                </div>
                <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {m.hits}× dibaca</span>
                  {m.latihan_count > 0 && (
                    <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {m.latihan_count} latihan terhubung</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => bukaEditMateri(m)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => hapusMateri(m)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {!loading && materiDalamTp.length === 0 && (
            <p className="text-center text-sm text-ink-300 py-8">Belum ada materi di TP ini.</p>
          )}
        </div>

        {showMateriForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowMateriForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
                <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-600" /> {editingMateri ? 'Edit Materi' : 'Tulis Materi'}
                </h3>
                <button onClick={() => setShowMateriForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={simpanMateri} className="p-5 overflow-y-auto space-y-3">
                {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                <input placeholder="Judul materi" value={materiForm.judul} onChange={(e) => setMateriForm({ ...materiForm, judul: e.target.value })} className="field-input w-full" required />
                <select value={materiForm.status} onChange={(e) => setMateriForm({ ...materiForm, status: e.target.value })} className="field-input text-ink-700">
                  <option value="draft">Draf (belum terlihat siswa)</option>
                  <option value="terbit">Terbit (siswa bisa baca)</option>
                </select>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1"><ImagePlus className="w-3.5 h-3.5" /> Gambar Sampul (opsional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setGambarFile(e.target.files[0] || null)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Isi Materi</label>
                  <RichTextEditor value={materiForm.isi} onChange={(html) => setMateriForm({ ...materiForm, isi: html })} placeholder="Tulis materi di sini..." />
                </div>
                {editingMateri?.latihan_count > 0 && (
                  <p className="text-xs text-ink-500 bg-mist-50 border border-line-200 rounded-lg px-3 py-2">
                    Materi ini punya {editingMateri.latihan_count} latihan terhubung — atur/lepas keterhubungannya lewat menu Buat Ujian, saat membuat/mengubah latihan.
                  </p>
                )}
                <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== Level 1: daftar TP per mapel =====
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-ink-500">{tpList.length} TP</div>
        {subjectOptions.length > 0 && (
          <button onClick={bukaTambahTp} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tambah TP
          </button>
        )}
      </div>

      {assignments.length === 0 && !loading ? (
        <p className="text-center text-sm text-ink-300 py-8">Anda belum punya Tugas Mengajar di tahun ajaran ini — hubungi Waka Kurikulum.</p>
      ) : (
        <div className="space-y-5">
          {tpDikelompokkan.map(([mapel, list]) => (
            <div key={mapel}>
              <p className="text-xs font-semibold text-ink-500 mb-2">{mapel}</p>
              <div className="space-y-2">
                {list.map((tp) => (
                  <div key={tp.id} className="surface-card p-4 flex items-start justify-between gap-3">
                    <button onClick={() => setSelectedTp(tp)} className="min-w-0 flex-1 text-left flex items-center gap-2 hover:opacity-80 transition">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900 truncate">{tp.judul}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{tp.materi_list_count} materi</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => bukaEditTp(tp)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => hapusTp(tp)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!loading && tpList.length === 0 && (
            <p className="text-center text-sm text-ink-300 py-8">Belum ada TP dibuat — tambah TP dulu sebelum menulis materi.</p>
          )}
        </div>
      )}

      {showTpForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowTpForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">{editingTp ? 'Edit TP' : 'Tambah TP'}</h3>
              <button onClick={() => setShowTpForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={simpanTp} className="p-5 space-y-3">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              {!editingTp && (
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Mata Pelajaran</label>
                  <select value={tpForm.subject_id} onChange={(e) => setTpForm({ ...tpForm, subject_id: e.target.value })} className="field-input" required>
                    <option value="">— Pilih —</option>
                    {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Judul TP</label>
                <input placeholder="mis. Memahami Dasar Jaringan Komputer" value={tpForm.judul} onChange={(e) => setTpForm({ ...tpForm, judul: e.target.value })} className="field-input w-full" required />
              </div>
              <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
