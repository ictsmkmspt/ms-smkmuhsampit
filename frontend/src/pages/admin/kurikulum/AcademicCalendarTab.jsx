import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../api/axios';
import AgendaCalendar, { JENIS_LABEL, JENIS_WARNA, fmtDMY, kelompokkanLibur } from '../../../components/AcademicAgendaCalendar';

export default function AcademicCalendarTab() {
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [tanggal, setTanggal] = useState({ tanggal_mulai: '', tanggal_selesai: '' });
  const [savingTahun, setSavingTahun] = useState(false);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ nama: '', jenis: 'semester_ganjil', tanggal_mulai: '', tanggal_selesai: '', keterangan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [halamanLibur, setHalamanLibur] = useState(1);

  const aktif = tahunAjaranList.find((t) => t.status === 'aktif');

  const LIBUR_PER_HALAMAN = 10;
  // Terbaru dulu — kelompokkanLibur mengurutkan menaik (perlu begitu supaya
  // rentang tanggal tergabung benar), jadi dibalik lagi di sini buat tampilan.
  const liburDikelompokkan = useMemo(() => kelompokkanLibur(holidays).reverse(), [holidays]);
  const totalHalamanLibur = Math.max(1, Math.ceil(liburDikelompokkan.length / LIBUR_PER_HALAMAN));
  const liburHalamanIni = liburDikelompokkan.slice((halamanLibur - 1) * LIBUR_PER_HALAMAN, halamanLibur * LIBUR_PER_HALAMAN);

  const loadTahunAjaran = () => api.get('/tahun-ajaran').then((res) => {
    setTahunAjaranList(res.data);
    const a = res.data.find((t) => t.status === 'aktif');
    if (a) setTanggal({ tanggal_mulai: a.tanggal_mulai || '', tanggal_selesai: a.tanggal_selesai || '' });
  });
  const loadEvents = () => api.get('/academic-events').then((res) => setEvents(res.data));

  useEffect(() => {
    loadTahunAjaran();
    loadEvents();
    api.get('/holidays').then((res) => setHolidays(res.data));
  }, []);

  const handleSaveTahun = async () => {
    if (!aktif) return;
    setSavingTahun(true);
    try {
      await api.put(`/tahun-ajaran/${aktif.id}`, tanggal);
      loadTahunAjaran();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tanggal tahun ajaran.');
    } finally {
      setSavingTahun(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/academic-events', form);
      setForm({ nama: '', jenis: 'semester_ganjil', tanggal_mulai: '', tanggal_selesai: '', keterangan: '' });
      loadEvents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah agenda.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (ev) => {
    if (!confirm(`Hapus agenda "${ev.nama}"?`)) return;
    await api.delete(`/academic-events/${ev.id}`);
    loadEvents();
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <div className="flex gap-2 mb-4">
          <CalendarRange className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700">
            Tanggal mulai/selesai tahun ajaran aktif {aktif ? <b>({aktif.nama})</b> : null}. Agenda semester/UTS/UAS/libur diatur terpisah di tabel bawah.
          </p>
        </div>
        {aktif ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Mulai</label>
              <input type="date" value={tanggal.tanggal_mulai || ''} onChange={(e) => setTanggal({ ...tanggal, tanggal_mulai: e.target.value })} className="field-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Selesai</label>
              <input type="date" value={tanggal.tanggal_selesai || ''} onChange={(e) => setTanggal({ ...tanggal, tanggal_selesai: e.target.value })} className="field-input" />
            </div>
            <button onClick={handleSaveTahun} disabled={savingTahun} className="btn-primary"><Save className="w-4 h-4" /> {savingTahun ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        ) : (
          <p className="text-sm text-ink-400">Belum ada tahun ajaran aktif.</p>
        )}
      </div>

      <AgendaCalendar events={events} holidays={holidays} />

      <form onSubmit={handleAddEvent} className="surface-card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink-900">Tambah Agenda Kalender Akademik</h2>
        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="Nama agenda" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="field-input col-span-2" required />
          <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="field-input text-ink-700">
            {Object.entries(JENIS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Dari Tanggal</label>
            <input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} className="field-input w-full" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Sampai Tanggal</label>
            <input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="field-input w-full" required />
          </div>
          <input placeholder="Keterangan (opsional)" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="field-input" />
        </div>
        <button disabled={loading} className="btn-primary"><Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Agenda'}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Agenda <span className="text-ink-500 font-sans font-normal text-sm">({events.length})</span></h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium">Nama</th>
              <th className="font-medium">Jenis</th>
              <th className="font-medium">Tanggal</th>
              <th className="font-medium">Keterangan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900">{ev.nama}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: JENIS_WARNA[ev.jenis] }}>
                    {JENIS_LABEL[ev.jenis]}
                  </span>
                </td>
                <td className="text-ink-700 font-mono">{fmtDMY(ev.tanggal_mulai)} – {fmtDMY(ev.tanggal_selesai)}</td>
                <td className="text-ink-700">{ev.keterangan || '-'}</td>
                <td className="text-right"><button onClick={() => handleDeleteEvent(ev)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-ink-300">Belum ada agenda untuk tahun ajaran aktif.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Daftar Hari Libur</h2>
        <p className="text-xs text-ink-500 mb-4">
          Tanggal yang tersorot merah di kalender di atas adalah hari libur — daftarnya berikut ini, diambil dari menu Kalender Libur, terbaru lebih dulu. Rentang tanggal berurutan dengan keterangan sama digabung jadi 1 baris.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium w-48">Tanggal</th>
              <th className="font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {liburHalamanIni.map((h) => (
              <tr key={h.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-900">
                  {h.tanggal_mulai === h.tanggal_akhir ? fmtDMY(h.tanggal_mulai) : `${fmtDMY(h.tanggal_mulai)} – ${fmtDMY(h.tanggal_akhir)}`}
                </td>
                <td className="text-ink-700">{h.keterangan}</td>
              </tr>
            ))}
            {holidays.length === 0 && <tr><td colSpan="2" className="py-6 text-center text-ink-300">Belum ada hari libur tercatat.</td></tr>}
          </tbody>
        </table>
        {liburDikelompokkan.length > LIBUR_PER_HALAMAN && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-ink-500 mr-2">Halaman {halamanLibur} dari {totalHalamanLibur}</span>
            <button
              onClick={() => setHalamanLibur((p) => Math.max(1, p - 1))}
              disabled={halamanLibur === 1}
              className="flex items-center gap-1 text-xs font-medium text-ink-600 border border-line-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <button
              onClick={() => setHalamanLibur((p) => Math.min(totalHalamanLibur, p + 1))}
              disabled={halamanLibur === totalHalamanLibur}
              className="flex items-center gap-1 text-xs font-medium text-ink-600 border border-line-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              Berikutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
