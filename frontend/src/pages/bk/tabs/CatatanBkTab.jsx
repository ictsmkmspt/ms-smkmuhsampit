import { useEffect, useState } from 'react';
import { Plus, Trash2, HeartHandshake } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { fmtDMY } from '../../../utils/date';

const KATEGORI_LABEL = { akademik: 'Akademik', perilaku: 'Perilaku', sosial: 'Sosial', keluarga: 'Keluarga', lainnya: 'Lainnya' };
const KOSONG = { student_id: '', sanksi_kejadian_id: '', tanggal: '', kategori: 'perilaku', catatan: '', tindak_lanjut: '' };

/**
 * Catatan bimbingan konseling per siswa — bisa berdiri sendiri (kasus umum
 * di luar poin pelanggaran) atau menjadi tindak lanjut dari 1 kejadian
 * sanksi tertentu (lihat prop `prefill`, diisi dari tombol "Catat Tindak
 * Lanjut" di tab Sanksi Siswa).
 */
export default function CatatanBkTab({ prefill, onPrefillUsed }) {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { page, setPage, totalPages, paginated: casesHalaman } = usePagination(cases, 30);

  const loadCases = () => api.get('/bk-cases').then((res) => setCases(res.data));
  useEffect(() => {
    loadCases();
    api.get('/bk-students').then((res) => setStudents(res.data));
  }, []);

  useEffect(() => {
    if (prefill) {
      setForm({
        student_id: prefill.student_id,
        sanksi_kejadian_id: prefill.id,
        tanggal: new Date().toISOString().slice(0, 10),
        kategori: 'perilaku',
        catatan: '',
        tindak_lanjut: '',
      });
      onPrefillUsed?.();
    }
  }, [prefill]); // eslint-disable-line

  const prefillInfo = form.sanksi_kejadian_id
    ? students.find((s) => s.id === Number(form.student_id))
    : null;

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/bk-cases', form);
      setForm(KOSONG);
      loadCases();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan catatan BK.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditForm({ tindak_lanjut: c.tindak_lanjut || '', status: c.status });
  };

  const handleSaveEdit = async (id) => {
    await api.put(`/bk-cases/${id}`, editForm);
    setEditId(null);
    loadCases();
  };

  const handleDelete = async (c) => {
    if (!confirm(`Hapus catatan BK untuk "${c.student?.user?.name}"?`)) return;
    await api.delete(`/bk-cases/${c.id}`);
    loadCases();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <HeartHandshake className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Catatan bimbingan konseling per siswa — terpisah dari poin pelanggaran, dipakai untuk mencatat kasus & tindak lanjut yang sifatnya naratif/pembinaan, bukan sanksi poin.
        </p>
      </div>

      <form onSubmit={handleAdd} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Catatan BK</h2>
        {form.sanksi_kejadian_id && (
          <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Mencatat tindak lanjut untuk {prefillInfo?.user?.name || 'siswa terpilih'} — terhubung ke kejadian sanksi #{form.sanksi_kejadian_id}.
          </p>
        )}
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="field-input text-ink-700" required disabled={!!form.sanksi_kejadian_id}>
            <option value="">Pilih Siswa</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.user?.name} — {s.class_room?.name || 'tanpa kelas'}</option>
            ))}
          </select>
          <DateInput value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field-input" required />
          <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="field-input text-ink-700">
            {Object.entries(KATEGORI_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div />
          <textarea placeholder="Catatan kasus" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="field-input col-span-2" rows={2} required />
          <textarea placeholder="Tindak lanjut (opsional)" value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} className="field-input col-span-2" rows={2} />
        </div>
        <div className="flex gap-2">
          <button disabled={loading} className="btn-primary">
            <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Simpan Catatan'}
          </button>
          {form.sanksi_kejadian_id && (
            <button type="button" onClick={() => setForm(KOSONG)} className="text-sm px-4 py-2 text-ink-500 hover:text-ink-700">Batal tautkan</button>
          )}
        </div>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Riwayat Catatan BK <span className="text-ink-500 font-sans font-normal text-sm">({cases.length})</span>
        </h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Siswa</th>
              <th className="font-medium whitespace-nowrap px-2">Tanggal</th>
              <th className="font-medium whitespace-nowrap px-2">Kategori</th>
              <th className="font-medium whitespace-nowrap px-2">Catatan</th>
              <th className="font-medium whitespace-nowrap px-2">Tindak Lanjut</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {casesHalaman.map((c) => (
              <tr key={c.id} className="border-t border-line-200 align-top">
                <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">
                  {c.student?.user?.name}
                  <div className="text-xs text-ink-400">{c.student?.class_room?.name}</div>
                  {c.sanksi_kejadian && <div className="text-[11px] text-honey-700 mt-0.5">↳ {c.sanksi_kejadian.sanksi_rule?.nama}</div>}
                </td>
                <td className="text-ink-700 font-mono whitespace-nowrap px-2">{fmtDMY(c.tanggal)}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{KATEGORI_LABEL[c.kategori]}</td>
                <td className="text-ink-700 max-w-[16rem] whitespace-nowrap px-2"><TruncateText text={c.catatan} /></td>
                <td className="text-ink-700 max-w-[14rem] whitespace-nowrap px-2">
                  {editId === c.id ? (
                    <textarea value={editForm.tindak_lanjut} onChange={(e) => setEditForm({ ...editForm, tindak_lanjut: e.target.value })} className="field-input" rows={2} />
                  ) : (
                    <TruncateText text={c.tindak_lanjut} />
                  )}
                </td>
                <td className="text-center whitespace-nowrap px-2">
                  {editId === c.id ? (
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="field-input py-1 text-ink-700">
                      <option value="berjalan">Berjalan</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  ) : (
                    <span className={`badge-soft ${c.status === 'selesai' ? 'badge-brand' : 'badge-honey'}`}>{c.status === 'selesai' ? 'Selesai' : 'Berjalan'}</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  {editId === c.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(c.id)} className="text-xs text-brand-600 font-medium mr-2">Simpan</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-ink-300">Batal</button>
                    </>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(c)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                      <button onClick={() => handleDelete(c)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada catatan BK.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
