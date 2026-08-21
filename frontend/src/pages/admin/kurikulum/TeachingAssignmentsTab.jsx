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
  // Guru + mapel + target jam diisi SEKALI, lalu kelasnya boleh dicentang
  // banyak sekaligus (bukan lagi 1 kelas per submit) — pola sama seperti
  // roster "Buat Penempatan PKL".
  const [bulkTeacherId, setBulkTeacherId] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkTargetJam, setBulkTargetJam] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());
  const [bulkResult, setBulkResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editJam, setEditJam] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [editingKodeId, setEditingKodeId] = useState(null);
  const [editKode, setEditKode] = useState('');
  const [editKodeSaving, setEditKodeSaving] = useState(false);
  const [errorKode, setErrorKode] = useState('');

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

  // Kelas yang mapel terpilih SUDAH punya penugasan di tahun ajaran ini —
  // dihitung dari data `assignments` yang sudah dimuat, tanpa perlu
  // request tambahan. Beda per tipe mapel (samakan dengan backend
  // storeBulk()): mapel "umum" dikunci lepas dari guru (1 kelas 1 guru
  // per mapel umum), mapel "kejuruan" cuma dikunci kalau GURU YANG SAMA
  // yang dipilih sudah ditugaskan — guru lain tetap boleh dicentang untuk
  // kelas+mapel yang sama (team teaching/mapel produktif).
  const selectedSubject = subjects.find((s) => String(s.id) === bulkSubjectId);
  const isKejuruan = selectedSubject?.tipe === 'kejuruan';
  const classIdsSudahAda = bulkSubjectId
    ? new Set(
        assignments
          .filter((a) => String(a.subject_id) === bulkSubjectId)
          .filter((a) => !isKejuruan || String(a.teacher_id) === bulkTeacherId)
          .map((a) => a.class_room_id)
      )
    : new Set();
  const classesBisaDipilih = classes.filter((c) => !classIdsSudahAda.has(c.id));
  const semuaKelasTerpilih = classesBisaDipilih.length > 0 && classesBisaDipilih.every((c) => selectedClassIds.has(c.id));

  const toggleClassSelected = (id) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllClasses = () => {
    setSelectedClassIds(semuaKelasTerpilih ? new Set() : new Set(classesBisaDipilih.map((c) => c.id)));
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBulkResult(null);
    if (selectedClassIds.size === 0) {
      setError('Pilih minimal 1 kelas dulu.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/teaching-assignments/bulk', {
        teacher_id: bulkTeacherId,
        subject_id: bulkSubjectId,
        class_room_ids: [...selectedClassIds],
        target_jam: bulkTargetJam || null,
      });
      setBulkResult(res.data);
      setSelectedClassIds(new Set());
      setShowForm(false);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah penugasan.');
    } finally {
      setLoading(false);
    }
  };

  const batalBulkForm = () => {
    setShowForm(false);
    setBulkSubjectId('');
    setBulkTeacherId('');
    setBulkTargetJam('');
    setSelectedClassIds(new Set());
    setError('');
    setBulkResult(null);
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

  const startEditKode = (a) => {
    setEditingKodeId(a.id);
    setEditKode(a.kode_guru ?? '');
    setErrorKode('');
  };
  const cancelEditKode = () => { setEditingKodeId(null); setErrorKode(''); };
  const saveEditKode = async (a) => {
    setEditKodeSaving(true);
    setErrorKode('');
    try {
      await api.put(`/teaching-assignments/${a.id}`, { teacher_id: a.teacher_id, target_jam: a.target_jam, kode_guru: editKode || null });
      setEditingKodeId(null);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setErrorKode(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan kode guru.');
    } finally {
      setEditKodeSaving(false);
    }
  };

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

      {tahunAktif && showForm && (
        <form onSubmit={handleBulkSubmit} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Penugasan</h2>
          <p className="text-xs text-ink-500 mb-4">
            Pilih mata pelajaran &amp; guru, centang kelas yang mau ditugaskan (boleh 1 atau banyak sekaligus), lalu isi target jam sekali untuk semua kelas yang dicentang.
          </p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          {bulkResult && (
            <div className="text-sm bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-brand-700 font-medium">{bulkResult.message}</p>
              {bulkResult.dilewati?.length > 0 && (
                <p className="text-ink-500 text-xs mt-1">Dilewati (sudah ada penugasan mapel ini): {bulkResult.dilewati.join(', ')}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <select
              value={bulkSubjectId}
              onChange={(e) => { setBulkSubjectId(e.target.value); setSelectedClassIds(new Set()); }}
              className="field-input text-ink-700" required
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
            <select
              value={bulkTeacherId}
              onChange={(e) => { setBulkTeacherId(e.target.value); if (isKejuruan) setSelectedClassIds(new Set()); }}
              className="field-input text-ink-700" required
            >
              <option value="">Pilih Guru</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
            </select>
            <input
              type="number" min="1" placeholder="Target jam (opsional)"
              value={bulkTargetJam} onChange={(e) => setBulkTargetJam(e.target.value)}
              className="field-input"
            />
          </div>

          {isKejuruan && (
            <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-4">
              Mapel kejuruan — kelas yang sudah diampu guru LAIN tetap boleh dicentang (team teaching/mapel produktif boleh &gt;1 guru per kelas). "Sudah ada" di sini cuma mengunci kalau guru yang sama sudah ditugaskan.
            </p>
          )}

          {bulkSubjectId && (
            <div className="mb-4 border border-line-200 rounded-xl max-h-80 overflow-y-auto table-scroll">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 pt-2 pl-3 w-10">
                      <input type="checkbox" checked={semuaKelasTerpilih} onChange={toggleSelectAllClasses} disabled={classesBisaDipilih.length === 0} />
                    </th>
                    <th className="font-medium whitespace-nowrap px-2 pt-2">Kelas</th>
                    <th className="font-medium whitespace-nowrap px-2 pt-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr><td colSpan="3" className="py-4 text-center text-ink-300">Belum ada data kelas.</td></tr>
                  ) : classes.map((c) => {
                    const sudahAda = classIdsSudahAda.has(c.id);
                    return (
                      <tr key={c.id} className="border-t border-line-200">
                        <td className="pl-3 py-2">
                          <input type="checkbox" checked={selectedClassIds.has(c.id)} disabled={sudahAda} onChange={() => toggleClassSelected(c.id)} />
                        </td>
                        <td className="py-2 px-2 text-ink-900 whitespace-nowrap">{c.name}</td>
                        <td className="px-2 whitespace-nowrap">
                          {sudahAda
                            ? <span className="badge-soft badge-brand">Sudah ada</span>
                            : <span className="text-xs text-ink-300">Belum</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button disabled={loading || selectedClassIds.size === 0} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : `Tambah Penugasan (${selectedClassIds.size} kelas)`}
            </button>
            <button type="button" onClick={batalBulkForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Daftar Penugasan <span className="text-ink-500 font-sans font-normal text-sm">({assignments.length})</span></h2>
          <div className="flex items-center gap-2 flex-wrap">
            {tahunAktif && (
              <button
                onClick={handleGenerateKodeGuru}
                disabled={generating || assignments.length === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed border border-line-200 rounded-xl px-4 py-2 transition shrink-0"
              >
                <Wand2 className="w-4 h-4" /> {generating ? 'Membuat...' : 'Generate Kode Guru A-Z'}
              </button>
            )}
            {tahunAktif && !showForm && (
              <button onClick={() => setShowForm(true)} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Tambah Penugasan</button>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Kolom "Terjadwal" menghitung otomatis dari isian di menu Jadwal Pelajaran. Target jam boleh dikosongkan kalau memang tidak dipatok rata per minggu (mis. mapel blok/kejuruan).
          {tahunAktif && ' Seret baris pakai ikon di kiri untuk mengatur urutan tabel.'} Kode Guru bisa dibuat otomatis lewat tombol di atas, atau diklik langsung per baris untuk diubah manual — kode inilah yang tampil di Jadwal Pelajaran.
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
                <td className="py-2.5 whitespace-nowrap px-2">
                  {editingKodeId === a.id ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text" maxLength="10" autoFocus
                          value={editKode} onChange={(e) => setEditKode(e.target.value)}
                          className="field-input py-1 px-2 text-sm w-20 font-mono"
                          placeholder="-"
                        />
                        <button onClick={() => saveEditKode(a)} disabled={editKodeSaving} className="text-brand-600 hover:text-brand-800"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEditKode} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                      </div>
                      {errorKode && <p className="text-xs text-honey-700">{errorKode}</p>}
                    </div>
                  ) : tahunAktif ? (
                    <button onClick={() => startEditKode(a)} className="flex items-center gap-1.5 hover:text-brand-700">
                      <span className="badge-soft badge-brand font-mono">{a.kode_guru || '-'}</span>
                      <Pencil className="w-3 h-3 text-ink-300" />
                    </button>
                  ) : (
                    <span className="badge-soft badge-brand font-mono">{a.kode_guru || '-'}</span>
                  )}
                </td>
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
