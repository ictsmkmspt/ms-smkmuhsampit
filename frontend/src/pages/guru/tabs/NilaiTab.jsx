import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, ClipboardList } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NilaiTab() {
  const [assignments, setAssignments] = useState([]); // Tugas Mengajar milik guru ini
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [tanggal, setTanggal] = useState(hariIniIso());
  const [nilaiPerSiswa, setNilaiPerSiswa] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null); // baris AcademicScore yang sedang diedit
  const [editForm, setEditForm] = useState({ nama_kegiatan: '', skor: '', tanggal: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [viewingKey, setViewingKey] = useState(null); // key kegiatan yang lagi dibuka detailnya

  useEffect(() => {
    api.get('/my-teaching-assignments').then((res) => setAssignments(res.data));
  }, []);

  // Mapel & kelas dibatasi cuma yang benar-benar diampu guru ini (dari
  // Tugas Mengajar), bukan seluruh mapel/kelas se-sekolah. Kelas yang
  // muncul cuma yang diampu guru ini UNTUK mapel yang sedang dipilih —
  // supaya tidak salah pilih kombinasi yang sebenarnya bukan miliknya.
  const subjectOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => { if (a.subject) map.set(a.subject.id, a.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [assignments]);

  const classOptions = useMemo(() => {
    if (!subjectId) return [];
    const map = new Map();
    assignments
      .filter((a) => a.subject_id === Number(subjectId))
      .forEach((a) => { if (a.class_room) map.set(a.class_room.id, a.class_room); });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, subjectId]);

  useEffect(() => {
    // Kalau ganti mapel dan kelas yang sebelumnya dipilih ternyata tidak
    // diampu guru ini untuk mapel baru itu, kosongkan lagi pilihannya.
    if (classId && !classOptions.some((c) => c.id === Number(classId))) {
      setClassId('');
    }
  }, [subjectId, classOptions]); // eslint-disable-line

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    api.get('/students', { params: { class_room_id: classId } }).then((res) => setStudents(res.data));
  }, [classId]);

  const loadScores = () => {
    if (!subjectId || !classId) { setScores([]); return; }
    setLoading(true);
    api.get('/academic-scores', { params: { subject_id: subjectId, class_room_id: classId } })
      .then((res) => setScores(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadScores, [subjectId, classId]); // eslint-disable-line

  const bukaForm = () => {
    setNamaKegiatan('');
    setTanggal(hariIniIso());
    setNilaiPerSiswa({});
    setError('');
    setShowForm(true);
  };

  const handleSimpanSemua = async (e) => {
    e.preventDefault();
    setError('');

    // Siswa yang dikosongkan (tidak diisi guru) otomatis tercatat skor 0 —
    // supaya jelas tercatat "belum/tidak mengerjakan", bukan diam-diam
    // hilang dari rekap kegiatan ini.
    const isian = students.map((s) => ({
      student_id: s.id,
      nilai: nilaiPerSiswa[s.id] !== undefined && nilaiPerSiswa[s.id] !== '' ? Number(nilaiPerSiswa[s.id]) : 0,
    }));

    if (isian.length === 0) {
      setError('Belum ada siswa di kelas ini.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/academic-scores/bulk', {
        subject_id: subjectId,
        nama_kegiatan: namaKegiatan,
        tanggal,
        skor: isian,
      });
      setShowForm(false);
      loadScores();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  const bukaEdit = (row) => {
    setEditing(row);
    setEditForm({ nama_kegiatan: row.nama_kegiatan, skor: row.skor, tanggal: row.tanggal });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/academic-scores/${editing.id}`, editForm);
      setEditing(null);
      loadScores();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Hapus nilai "${row.nama_kegiatan}" milik ${row.student?.user?.name}?`)) return;
    await api.delete(`/academic-scores/${row.id}`);
    loadScores();
  };

  const kelasTerpilih = classOptions.find((c) => c.id === Number(classId));
  const rataRata = useMemo(() => {
    if (scores.length === 0) return null;
    return (scores.reduce((sum, s) => sum + s.skor, 0) / scores.length).toFixed(1);
  }, [scores]);

  // Dikelompokkan per kegiatan (nama + tanggal) — supaya guru lihat daftar
  // kegiatan dulu (mis. "PR Bab 3", "UH 2"), baru klik salah satu untuk
  // lihat rincian nilai tiap siswa di kegiatan itu, bukan tabel datar
  // ribuan baris siswa+kegiatan tercampur.
  const kegiatanList = useMemo(() => {
    const map = new Map();
    scores.forEach((row) => {
      const key = `${row.nama_kegiatan}||${row.tanggal}`;
      if (!map.has(key)) map.set(key, { key, nama_kegiatan: row.nama_kegiatan, tanggal: row.tanggal, items: [] });
      map.get(key).items.push(row);
    });
    return [...map.values()]
      .map((g) => ({ ...g, rataRata: (g.items.reduce((sum, s) => sum + s.skor, 0) / g.items.length).toFixed(1) }))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [scores]);

  const viewingKegiatan = kegiatanList.find((g) => g.key === viewingKey) || null;

  return (
    <div>
      <div className="surface-card p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Mata Pelajaran</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="field-input text-ink-700 text-sm">
              <option value="">— Pilih —</option>
              {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!subjectId} className="field-input text-ink-700 text-sm disabled:opacity-50">
              <option value="">— Pilih —</option>
              {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <p className="text-center text-sm text-ink-300 py-8">Anda belum punya Tugas Mengajar di tahun ajaran ini — hubungi Waka Kurikulum.</p>
      ) : !subjectId || !classId ? (
        <p className="text-center text-sm text-ink-300 py-8">Pilih mata pelajaran dan kelas dulu untuk mulai mengisi nilai.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm text-ink-500">
              {kegiatanList.length} kegiatan · {scores.length} nilai tercatat{rataRata && <> · rata-rata <b className="text-ink-900">{rataRata}</b></>}
            </div>
            <button onClick={bukaForm} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Tambah Nilai
            </button>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Kegiatan</th>
                    <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Tanggal</th>
                    <th className="pb-2 pt-3 font-medium text-center whitespace-nowrap px-2">Siswa Dinilai</th>
                    <th className="pb-2 pt-3 pr-4 font-medium text-center whitespace-nowrap px-2">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {kegiatanList.map((g) => (
                    <tr
                      key={g.key}
                      onClick={() => setViewingKey(g.key)}
                      className="border-t border-line-200 cursor-pointer hover:bg-mist-50 transition"
                    >
                      <td className="py-2.5 pl-4 text-ink-900 font-medium whitespace-nowrap px-2">{g.nama_kegiatan}</td>
                      <td className="text-ink-500 font-mono text-xs whitespace-nowrap px-2">{g.tanggal}</td>
                      <td className="text-center text-ink-700 whitespace-nowrap px-2">{g.items.length}</td>
                      <td className="pr-4 text-center font-semibold text-ink-900 whitespace-nowrap px-2">{g.rataRata}</td>
                    </tr>
                  ))}
                  {!loading && kegiatanList.length === 0 && (
                    <tr><td colSpan="4" className="py-8 text-center text-ink-300">Belum ada nilai untuk {kelasTerpilih?.name} di mapel ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== Modal: tambah nilai untuk semua siswa sekaligus ===== */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <div>
                <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-brand-600" /> Tambah Nilai</h3>
                <p className="text-xs text-ink-500 mt-0.5">{kelasTerpilih?.name} · {subjectOptions.find((s) => s.id === Number(subjectId))?.nama}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSimpanSemua} className="p-5 overflow-y-auto space-y-3">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nama kegiatan (mis. PR Bab 3)" value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} className="field-input" required />
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="field-input" required />
              </div>
              <p className="text-xs text-ink-400">Isi skor 0–100 per siswa — yang dikosongkan otomatis tercatat <b>0</b>, bukan dilewati.</p>
              <div className="divide-y divide-line-200 border border-line-200 rounded-xl overflow-hidden">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm text-ink-900 min-w-0 flex-1"><TruncateText text={s.user?.name} /></span>
                    <input
                      type="number" min="0" max="100" placeholder="0"
                      value={nilaiPerSiswa[s.id] ?? ''}
                      onChange={(e) => setNilaiPerSiswa((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="field-input w-20 text-center py-1.5"
                    />
                  </div>
                ))}
                {students.length === 0 && <p className="text-sm text-ink-300 text-center py-6">Belum ada siswa di kelas ini.</p>}
              </div>
              <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan Semua'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal: rincian nilai semua siswa dalam 1 kegiatan ===== */}
      {viewingKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setViewingKey(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{viewingKegiatan?.nama_kegiatan}</h3>
                <p className="text-xs text-ink-500 mt-0.5">{viewingKegiatan?.tanggal} · rata-rata {viewingKegiatan?.rataRata}</p>
              </div>
              <button onClick={() => setViewingKey(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-line-200">
              {viewingKegiatan?.items.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-sm text-ink-900 min-w-0 flex-1"><TruncateText text={row.student?.user?.name} /></span>
                  <span className="font-semibold text-ink-900 shrink-0">{row.skor}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => bukaEdit(row)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {!viewingKegiatan?.items.length && (
                <p className="text-sm text-ink-300 text-center py-8">Semua nilai di kegiatan ini sudah dihapus.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: edit 1 baris nilai ===== */}
      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">{editing.student?.user?.name}</h3>
              <button onClick={() => setEditing(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3">
              <input placeholder="Nama kegiatan" value={editForm.nama_kegiatan} onChange={(e) => setEditForm({ ...editForm, nama_kegiatan: e.target.value })} className="field-input w-full" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={editForm.tanggal} onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })} className="field-input" required />
                <input type="number" min="0" max="100" value={editForm.skor} onChange={(e) => setEditForm({ ...editForm, skor: e.target.value })} className="field-input" required />
              </div>
              <button disabled={editSaving} className="btn-primary w-full justify-center">{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
