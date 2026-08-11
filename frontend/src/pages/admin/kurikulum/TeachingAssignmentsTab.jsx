import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, Wand2, GripVertical } from 'lucide-react';
import api from '../../../api/axios';
import { useTahunAjaran, useTahunAjaranParam } from '../../../context/TahunAjaranContext';

export default function TeachingAssignmentsTab() {
  const tahunParam = useTahunAjaranParam();
  const { isAktif: tahunAktif, selectedId: tahunAjaranIdTerpilih } = useTahunAjaran();
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_room_id: '', target_jam: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editJam, setEditJam] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Drag-and-drop urutan baris — server jadi acuan urutan (kolom `urutan`,
  // dikembalikan sudah terurut dari index()), jadi cukup pakai state
  // `assignments` apa adanya tanpa sort ulang di frontend.
  const [dragId, setDragId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const load = () => api.get('/teaching-assignments', { params: tahunParam }).then((res) => setAssignments(res.data));
  useEffect(() => {
    api.get('/teachers').then((res) => setTeachers(res.data));
    api.get('/subjects').then((res) => setSubjects(res.data));
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);
  useEffect(() => { load(); }, [tahunAjaranIdTerpilih]); // eslint-disable-line

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/teaching-assignments', { ...form, target_jam: form.target_jam || null });
      setForm({ teacher_id: '', subject_id: '', class_room_id: '', target_jam: '' });
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah penugasan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus penugasan "${a.subject?.nama}" di kelas "${a.class_room?.name}"? Isian jadwal yang sudah ditempatkan dari penugasan ini ikut terhapus.`)) return;
    await api.delete(`/teaching-assignments/${a.id}`);
    load();
  };

  const startEditJam = (a) => {
    setEditingId(a.id);
    setEditJam(a.target_jam ?? '');
  };
  const cancelEditJam = () => setEditingId(null);
  const handleGenerateKodeGuru = async () => {
    if (!confirm('Buat ulang Kode Guru untuk semua penugasan? Kode lama akan ditimpa, termasuk yang sudah tampil di Jadwal Pelajaran.')) return;
    setGenerating(true);
    try {
      const res = await api.post('/teaching-assignments/generate-kode-guru');
      setAssignments(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat kode guru.');
    } finally {
      setGenerating(false);
    }
  };
  const saveEditJam = async (a) => {
    setEditSaving(true);
    try {
      await api.put(`/teaching-assignments/${a.id}`, { teacher_id: a.teacher_id, target_jam: editJam || null });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan target jam.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDragStart = (id) => setDragId(id);

  const handleDragEnter = (id) => {
    if (dragId === null || dragId === id) return;
    setAssignments((prev) => {
      const items = [...prev];
      const fromIndex = items.findIndex((a) => a.id === dragId);
      const toIndex = items.findIndex((a) => a.id === id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items;
    });
  };

  const handleDragEnd = async () => {
    setDragId(null);
    setSavingOrder(true);
    try {
      await api.put('/teaching-assignments/reorder', { ids: assignments.map((a) => a.id) });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan urutan.');
      load(); // kembalikan ke urutan tersimpan terakhir kalau gagal
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          {tahunAktif
            ? 'Pembagian tugas mengajar untuk tahun ajaran yang sedang aktif.'
            : 'Anda sedang melihat tahun ajaran lain (bukan yang aktif) — tambah/ubah/hapus penugasan dinonaktifkan di sini. Kembali ke tahun ajaran aktif di sidebar untuk mengubahnya.'}
        </p>
      </div>

      {tahunAktif && (
        <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
          <h2 className="font-display font-semibold text-ink-900">Tambah Penugasan</h2>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value })} className="field-input text-ink-700" required>
              <option value="">Pilih Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="field-input text-ink-700" required>
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
            <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="field-input text-ink-700" required>
              <option value="">Pilih Guru</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
            </select>
            <input
              type="number" min="1" placeholder="Target jam (opsional)"
              value={form.target_jam} onChange={(e) => setForm({ ...form, target_jam: e.target.value })}
              className="field-input"
            />
          </div>
          <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Penugasan'}</button>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Penugasan <span className="text-ink-500 font-sans font-normal text-sm">({assignments.length})</span></h2>
          {tahunAktif && (
            <button
              onClick={handleGenerateKodeGuru}
              disabled={generating || assignments.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
            >
              <Wand2 className="w-4 h-4" /> {generating ? 'Membuat...' : 'Generate Kode Guru A-Z'}
            </button>
          )}
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Kolom "Terjadwal" menghitung otomatis dari isian di menu Jadwal Pelajaran. Target jam boleh dikosongkan kalau memang tidak dipatok rata per minggu (mis. mapel blok/kejuruan).
          {tahunAktif && ' Seret baris pakai ikon di kiri untuk mengatur urutan tabel.'} Kode Guru dibuat lewat tombol di atas mengikuti urutan baris ini — tidak perlu diisi manual — dan kode inilah yang tampil di Jadwal Pelajaran.
          {savingOrder && <span className="text-brand-600"> Menyimpan urutan...</span>}
        </p>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              {tahunAktif && <th className="w-6 whitespace-nowrap px-2"></th>}
              <th className="pb-2 font-medium whitespace-nowrap px-2">Kode Guru</th>
              <th className="font-medium whitespace-nowrap px-2">Kelas</th>
              <th className="font-medium whitespace-nowrap px-2">Mata Pelajaran</th>
              <th className="font-medium whitespace-nowrap px-2">Guru</th>
              <th className="font-medium whitespace-nowrap px-2">Terjadwal / Target Jam</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-line-200 ${dragId === a.id ? 'opacity-40' : ''}`}
                draggable={tahunAktif}
                onDragStart={() => handleDragStart(a.id)}
                onDragEnter={() => handleDragEnter(a.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
              >
                {tahunAktif && (
                  <td className="whitespace-nowrap px-2 cursor-grab active:cursor-grabbing text-ink-300 hover:text-ink-500">
                    <GripVertical className="w-4 h-4" />
                  </td>
                )}
                <td className="py-2.5 whitespace-nowrap px-2"><span className="badge-soft badge-brand font-mono">{a.kode_guru || '-'}</span></td>
                <td className="text-ink-900 whitespace-nowrap px-2">{a.class_room?.name}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">
                  {a.subject?.nama}
                  {a.subject?.kode && <span className="text-ink-400 font-mono text-xs ml-1.5">({a.subject.kode})</span>}
                </td>
                <td className="text-ink-700 whitespace-nowrap px-2">{a.teacher?.user?.name}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">
                  {editingId === a.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="1" autoFocus
                        value={editJam} onChange={(e) => setEditJam(e.target.value)}
                        className="field-input py-1 px-2 text-sm w-20"
                        placeholder="-"
                      />
                      <button onClick={() => saveEditJam(a)} disabled={editSaving} className="text-brand-600 hover:text-brand-800"><Check className="w-4 h-4" /></button>
                      <button onClick={cancelEditJam} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : tahunAktif ? (
                    <button onClick={() => startEditJam(a)} className="flex items-center gap-1.5 hover:text-brand-700">
                      <span className={a.target_jam && a.schedules_count >= a.target_jam ? 'font-medium text-brand-700' : ''}>
                        {a.schedules_count ?? 0} / {a.target_jam ?? '-'} jam
                      </span>
                      <Pencil className="w-3 h-3 text-ink-300" />
                    </button>
                  ) : (
                    <span>{a.schedules_count ?? 0} / {a.target_jam ?? '-'} jam</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  {tahunAktif && <button onClick={() => handleDelete(a)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
            {assignments.length === 0 && <tr><td colSpan={tahunAktif ? 7 : 6} className="py-6 text-center text-ink-300 whitespace-nowrap px-2">{tahunAktif ? 'Belum ada penugasan untuk tahun ajaran aktif.' : 'Tidak ada penugasan untuk tahun ajaran ini.'}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
