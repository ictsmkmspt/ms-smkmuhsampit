import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, ScrollText } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const KOSONG_FORM = { class_room_id: '', tanggal: hariIniIso(), isian: {} };

/**
 * Tadarus (membaca Al-Quran, bukan menghafal) — dicatat per surah + rentang
 * ayat. Pola sama seperti Tahsin: tiap siswa punya isian sendiri-sendiri,
 * baris kosong dilewati saat simpan.
 */
export default function TadarusSection() {
  const [classes, setClasses] = useState([]);
  const [surahList, setSurahList] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(KOSONG_FORM);
  const [formStudents, setFormStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ surah: '', ayat_mulai: '', ayat_selesai: '', keterangan: '', tanggal: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [viewingKey, setViewingKey] = useState(null);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/quran-surah').then((res) => setSurahList(res.data));
  }, []);

  const namaSurah = (nomor) => surahList.find((s) => s.nomor === Number(nomor))?.nama || `Surah #${nomor}`;

  const loadScores = () => {
    setLoading(true);
    api.get('/tadarus-scores', { params: { class_room_id: classFilter || undefined } })
      .then((res) => setScores(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(loadScores, [classFilter]); // eslint-disable-line

  useEffect(() => {
    if (!form.class_room_id) { setFormStudents([]); return; }
    let cancelled = false;
    api.get('/students', { params: { class_room_id: form.class_room_id } }).then((res) => {
      if (!cancelled) setFormStudents(res.data);
    });
    return () => { cancelled = true; };
  }, [form.class_room_id]);

  const bukaForm = () => { setForm(KOSONG_FORM); setError(''); setShowForm(true); };

  const setIsian = (studentId, field, value) => {
    setForm((p) => ({ ...p, isian: { ...p.isian, [studentId]: { ...p.isian[studentId], [field]: value } } }));
  };

  const handleSimpanSemua = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.class_room_id) { setError('Pilih kelas dulu.'); return; }

    const entries = formStudents
      .map((s) => ({ student_id: s.id, ...form.isian[s.id] }))
      .filter((x) => x.ayat_mulai !== undefined && x.ayat_mulai !== '');

    if (entries.length === 0) { setError('Isi minimal 1 siswa (surah dan ayat).'); return; }
    if (entries.some((x) => !x.surah || !x.ayat_selesai)) {
      setError('Lengkapi surah, ayat mulai, dan ayat selesai untuk setiap siswa yang diisi.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/tadarus-scores/bulk', {
        tanggal: form.tanggal,
        entries: entries.map((x) => ({
          ...x, surah: Number(x.surah), ayat_mulai: Number(x.ayat_mulai), ayat_selesai: Number(x.ayat_selesai),
        })),
      });
      setShowForm(false);
      loadScores();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan catatan Tadarus.');
    } finally {
      setSaving(false);
    }
  };

  const bukaEdit = (row) => {
    setEditing(row);
    setEditForm({ surah: row.surah, ayat_mulai: row.ayat_mulai, ayat_selesai: row.ayat_selesai, keterangan: row.keterangan || '', tanggal: row.tanggal });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/tadarus-scores/${editing.id}`, editForm);
      setEditing(null);
      loadScores();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Hapus catatan Tadarus ${row.student?.user?.name} (${namaSurah(row.surah)} ${row.ayat_mulai}-${row.ayat_selesai})?`)) return;
    await api.delete(`/tadarus-scores/${row.id}`);
    loadScores();
  };

  const batchList = useMemo(() => {
    const map = new Map();
    scores.forEach((row) => {
      const key = `${row.student?.class_room_id}||${row.tanggal}`;
      if (!map.has(key)) {
        map.set(key, { key, tanggal: row.tanggal, classRoomName: row.student?.class_room?.name, items: [] });
      }
      map.get(key).items.push(row);
    });
    return [...map.values()].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [scores]);

  const viewingBatch = batchList.find((g) => g.key === viewingKey) || null;

  return (
    <div>
      <div className="surface-card p-4 mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-ink-500 mb-1">Saring Kelas</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="field-input text-ink-700 text-sm">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={bukaForm} className="btn-primary text-sm shrink-0"><Plus className="w-4 h-4" /> Tambah Catatan Tadarus</button>
      </div>

      <div className="text-sm text-ink-500 mb-3">{batchList.length} sesi &middot; {scores.length} catatan tercatat</div>

      <div className="surface-card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Tanggal</th>
                <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Kelas</th>
                <th className="pb-2 pt-3 pr-4 font-medium text-center whitespace-nowrap px-2">Siswa Dicatat</th>
              </tr>
            </thead>
            <tbody>
              {batchList.map((g) => (
                <tr key={g.key} onClick={() => setViewingKey(g.key)} className="border-t border-line-200 cursor-pointer hover:bg-mist-50 transition">
                  <td className="py-2.5 pl-4 font-mono text-xs whitespace-nowrap px-2">{g.tanggal}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{g.classRoomName}</td>
                  <td className="pr-4 text-center text-ink-700 whitespace-nowrap px-2">{g.items.length}</td>
                </tr>
              ))}
              {!loading && batchList.length === 0 && (
                <tr><td colSpan="3" className="py-8 text-center text-ink-300">{classFilter ? 'Tidak ada catatan untuk kelas ini.' : 'Belum ada catatan Tadarus.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal: tambah catatan untuk banyak siswa ===== */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2"><ScrollText className="w-4 h-4 text-brand-600" /> Tambah Catatan Tadarus</h3>
              <button onClick={() => setShowForm(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSimpanSemua} className="p-5 overflow-y-auto space-y-3">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
                  <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value, isian: {} })} className="field-input" required>
                    <option value="">— Pilih —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field-input" required />
                </div>
              </div>
              <p className="text-xs text-ink-400">Isi surah dan rentang ayat per siswa yang maju hari ini — siswa yang tidak diisi otomatis DILEWATI.</p>
              <div className="divide-y divide-line-200 border border-line-200 rounded-xl overflow-hidden">
                {formStudents.map((s) => {
                  const isi = form.isian[s.id] || {};
                  return (
                    <div key={s.id} className="flex items-center flex-wrap gap-2 px-3 py-2">
                      <span className="text-sm text-ink-900 min-w-0 w-full sm:w-auto sm:flex-1 sm:basis-28"><TruncateText text={s.user?.name} /></span>
                      <select value={isi.surah ?? ''} onChange={(e) => setIsian(s.id, 'surah', e.target.value)} className="field-input flex-1 min-w-[8rem] py-1.5 text-sm">
                        <option value="">Surah</option>
                        {surahList.map((sr) => <option key={sr.nomor} value={sr.nomor}>{sr.nomor}. {sr.nama}</option>)}
                      </select>
                      <input type="number" min="1" placeholder="Awal" value={isi.ayat_mulai ?? ''} onChange={(e) => setIsian(s.id, 'ayat_mulai', e.target.value)} className="field-input w-16 py-1.5 text-sm text-center" />
                      <input type="number" min="1" placeholder="Akhir" value={isi.ayat_selesai ?? ''} onChange={(e) => setIsian(s.id, 'ayat_selesai', e.target.value)} className="field-input w-16 py-1.5 text-sm text-center" />
                    </div>
                  );
                })}
                {form.class_room_id && formStudents.length === 0 && <p className="text-sm text-ink-300 text-center py-6">Belum ada siswa di kelas ini.</p>}
                {!form.class_room_id && <p className="text-sm text-ink-300 text-center py-6">Pilih kelas dulu.</p>}
              </div>
              <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan Semua'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal: rincian 1 sesi (tanggal+kelas) ===== */}
      {viewingKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setViewingKey(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-ink-900">{viewingBatch?.classRoomName}</h3>
                <p className="text-xs text-ink-500 mt-0.5">{viewingBatch?.tanggal}</p>
              </div>
              <button onClick={() => setViewingKey(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-line-200">
              {viewingBatch?.items.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900 truncate"><TruncateText text={row.student?.user?.name} /></p>
                    <p className="text-xs text-ink-500">{namaSurah(row.surah)} : {row.ayat_mulai}-{row.ayat_selesai}{row.keterangan ? ` · ${row.keterangan}` : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => bukaEdit(row)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: edit 1 catatan ===== */}
      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">{editing.student?.user?.name}</h3>
              <button onClick={() => setEditing(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3">
              <select value={editForm.surah} onChange={(e) => setEditForm({ ...editForm, surah: e.target.value })} className="field-input w-full" required>
                <option value="">— Pilih Surah —</option>
                {surahList.map((sr) => <option key={sr.nomor} value={sr.nomor}>{sr.nomor}. {sr.nama}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="1" placeholder="Ayat Mulai" value={editForm.ayat_mulai} onChange={(e) => setEditForm({ ...editForm, ayat_mulai: e.target.value })} className="field-input" required />
                <input type="number" min="1" placeholder="Ayat Selesai" value={editForm.ayat_selesai} onChange={(e) => setEditForm({ ...editForm, ayat_selesai: e.target.value })} className="field-input" required />
              </div>
              <input type="date" value={editForm.tanggal} onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })} className="field-input w-full" required />
              <input placeholder="Keterangan (opsional)" value={editForm.keterangan} onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })} className="field-input w-full" />
              <button disabled={editSaving} className="btn-primary w-full justify-center">{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
