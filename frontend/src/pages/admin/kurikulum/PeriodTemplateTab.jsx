import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Clock, Sparkles } from 'lucide-react';
import api from '../../../api/axios';

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: "Jum'at", sabtu: 'Sabtu' };

const FORM_KOSONG = { hari: 'senin', jam_ke: '', waktu_mulai: '', waktu_selesai: '', tipe: 'pelajaran', label_khusus: '', warna: '#D4F5D4' };

/**
 * Template baris jam/slot yang dipakai tombol "Muat Template Default" di
 * menu Jadwal Pelajaran — diedit di sini (bukan lagi hardcode di kode),
 * supaya Waka Kurikulum bisa menyesuaikan sendiri kalau jadwal master
 * sekolah berubah, tanpa perlu ganti kode.
 */
export default function PeriodTemplateTab() {
  const [selectedDay, setSelectedDay] = useState('senin');
  const [rows, setRows] = useState([]);

  const [modal, setModal] = useState(null); // null | { editing: row|null }
  const [form, setForm] = useState(FORM_KOSONG);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/period-templates').then((res) => setRows(res.data));
  useEffect(() => { load(); }, []);

  const rowsForDay = rows.filter((r) => r.hari === selectedDay);

  const openAdd = () => {
    setForm({ ...FORM_KOSONG, hari: selectedDay });
    setError('');
    setModal({ editing: null });
  };
  const openEdit = (r) => {
    setForm({ hari: r.hari, jam_ke: r.jam_ke || '', waktu_mulai: r.waktu_mulai?.slice(0, 5) || '', waktu_selesai: r.waktu_selesai?.slice(0, 5) || '', tipe: r.tipe, label_khusus: r.label_khusus || '', warna: r.warna || '#D4F5D4' });
    setError('');
    setModal({ editing: r });
  };
  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (modal.editing) {
        await api.put(`/period-templates/${modal.editing.id}`, form);
      } else {
        await api.post('/period-templates', form);
      }
      setModal(null);
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan baris template.');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (r) => {
    if (!confirm(`Hapus baris template ${r.waktu_mulai?.slice(0, 5)}-${r.waktu_selesai?.slice(0, 5)}?`)) return;
    await api.delete(`/period-templates/${r.id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Struktur jam ini otomatis dipakai di menu <b>Jadwal Pelajaran</b> — tidak perlu dimuat manual. Ubah di sini kalau jadwal master sekolah (jam masuk/pulang, jam istirahat, dll) berubah; perubahan langsung berlaku untuk semua tahun ajaran begitu disimpan.
        </p>
      </div>

      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 w-fit flex-wrap">
        {HARI_LIST.map((h) => (
          <button
            key={h}
            onClick={() => setSelectedDay(h)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${selectedDay === h ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'}`}
          >
            {HARI_LABEL[h]}
          </button>
        ))}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink-900">Template {HARI_LABEL[selectedDay]}</h2>
          <button onClick={openAdd} className="text-xs text-brand-600 hover:text-brand-800 font-medium border border-line-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tambah Baris
          </button>
        </div>

        <div className="table-scroll">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 pr-3 font-medium whitespace-nowrap">Waktu</th>
              <th className="pb-2 pr-3 font-medium whitespace-nowrap">Jam Ke</th>
              <th className="pb-2 font-medium">Keterangan</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rowsForDay.map((r) => (
              <tr key={r.id} className="border-t border-line-200">
                <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-ink-700">{r.waktu_mulai?.slice(0, 5)}-{r.waktu_selesai?.slice(0, 5)}</td>
                <td className="pr-3 text-ink-700">{r.jam_ke || '-'}</td>
                <td>
                  {r.tipe === 'khusus' ? (
                    <span className="inline-block rounded px-2 py-1 font-medium" style={{ backgroundColor: r.warna || '#f1f5f9' }}>{r.label_khusus}</span>
                  ) : (
                    <span className="text-ink-400">Jam pelajaran biasa</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="text-ink-400 hover:text-brand-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(r)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rowsForDay.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-ink-300">Belum ada baris template untuk hari ini.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2"><Clock className="w-4 h-4" /> {modal.editing ? 'Edit' : 'Tambah'} Baris Template</h3>
              <button onClick={() => setModal(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              <select value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })} className="field-input w-full text-ink-700">
                {HARI_LIST.map((h) => <option key={h} value={h}>{HARI_LABEL[h]}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Jam ke (mis. 1, opsional)" value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: e.target.value })} className="field-input" />
                <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="field-input text-ink-700">
                  <option value="pelajaran">Jam Pelajaran</option>
                  <option value="khusus">Kegiatan Khusus</option>
                </select>
                <input type="time" value={form.waktu_mulai} onChange={(e) => setForm({ ...form, waktu_mulai: e.target.value })} className="field-input" required />
                <input type="time" value={form.waktu_selesai} onChange={(e) => setForm({ ...form, waktu_selesai: e.target.value })} className="field-input" required />
              </div>
              {form.tipe === 'khusus' && (
                <>
                  <input placeholder="Label (mis. ISTIRAHAT PERTAMA)" value={form.label_khusus} onChange={(e) => setForm({ ...form, label_khusus: e.target.value })} className="field-input w-full" required />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ink-500">Warna</label>
                    <input type="color" value={form.warna} onChange={(e) => setForm({ ...form, warna: e.target.value })} className="h-8 w-14 rounded border border-line-200" />
                  </div>
                </>
              )}
              <button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
