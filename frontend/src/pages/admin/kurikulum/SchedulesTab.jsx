import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Download, Clock, Sparkles } from 'lucide-react';
import api from '../../../api/axios';

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: "Jum'at", sabtu: 'Sabtu' };

const PERIOD_FORM_KOSONG = { hari: 'senin', jam_ke: '', waktu_mulai: '', waktu_selesai: '', tipe: 'pelajaran', label_khusus: '', warna: '#D4F5D4' };
const CELL_FORM_KOSONG = { subject_id: '', teacher_id: '', kode: '' };

export default function SchedulesTab() {
  const [selectedDay, setSelectedDay] = useState('senin');
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [periodModal, setPeriodModal] = useState(null); // null | { editing: Period|null }
  const [periodForm, setPeriodForm] = useState(PERIOD_FORM_KOSONG);
  const [periodError, setPeriodError] = useState('');
  const [periodSaving, setPeriodSaving] = useState(false);

  const [cellModal, setCellModal] = useState(null); // null | { period, classRoom, existing }
  const [cellForm, setCellForm] = useState(CELL_FORM_KOSONG);
  const [cellError, setCellError] = useState('');
  const [cellSaving, setCellSaving] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportForm, setExportForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jadwal_export_ttd')) || {}; } catch { return {}; }
  });
  const [exporting, setExporting] = useState(false);

  const loadGrid = () => api.get('/schedules/grid').then((res) => {
    setClasses(res.data.classes);
    setPeriods(res.data.periods);
    setSchedules(res.data.schedules);
  });

  useEffect(() => {
    loadGrid();
    api.get('/subjects').then((res) => setSubjects(res.data));
    api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  const periodsForDay = periods.filter((p) => p.hari === selectedDay);
  const scheduleFor = (periodId, classId) => schedules.find((s) => s.period_id === periodId && s.class_room_id === classId);

  // ===== Period (baris jam/slot) =====
  const openAddPeriod = () => {
    setPeriodForm({ ...PERIOD_FORM_KOSONG, hari: selectedDay });
    setPeriodError('');
    setPeriodModal({ editing: null });
  };
  const openEditPeriod = (p) => {
    setPeriodForm({ hari: p.hari, jam_ke: p.jam_ke || '', waktu_mulai: p.waktu_mulai?.slice(0, 5) || '', waktu_selesai: p.waktu_selesai?.slice(0, 5) || '', tipe: p.tipe, label_khusus: p.label_khusus || '', warna: p.warna || '#D4F5D4' });
    setPeriodError('');
    setPeriodModal({ editing: p });
  };
  const handleSavePeriod = async (e) => {
    e.preventDefault();
    setPeriodError(''); setPeriodSaving(true);
    try {
      if (periodModal.editing) {
        await api.put(`/periods/${periodModal.editing.id}`, periodForm);
      } else {
        await api.post('/periods', periodForm);
      }
      setPeriodModal(null);
      loadGrid();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setPeriodError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan baris jadwal.');
    } finally {
      setPeriodSaving(false);
    }
  };
  const handleDeletePeriod = async (p) => {
    if (!confirm(`Hapus baris jam ${p.waktu_mulai?.slice(0, 5)}-${p.waktu_selesai?.slice(0, 5)}? Semua isian mapel di baris ini ikut terhapus.`)) return;
    await api.delete(`/periods/${p.id}`);
    loadGrid();
  };

  // ===== Cell (isian mapel per kelas per period) =====
  const openCell = (period, classRoom) => {
    const existing = scheduleFor(period.id, classRoom.id);
    setCellForm(existing ? { subject_id: existing.subject_id, teacher_id: existing.teacher_id || '', kode: existing.kode || '' } : CELL_FORM_KOSONG);
    setCellError('');
    setCellModal({ period, classRoom, existing });
  };
  const handleSaveCell = async (e) => {
    e.preventDefault();
    setCellError(''); setCellSaving(true);
    try {
      const payload = { ...cellForm, teacher_id: cellForm.teacher_id || null };
      if (cellModal.existing) {
        await api.put(`/schedules/${cellModal.existing.id}`, payload);
      } else {
        await api.post('/schedules', { ...payload, period_id: cellModal.period.id, class_room_id: cellModal.classRoom.id });
      }
      setCellModal(null);
      loadGrid();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setCellError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan isian jadwal.');
    } finally {
      setCellSaving(false);
    }
  };
  const handleDeleteCell = async () => {
    if (!cellModal.existing) return;
    await api.delete(`/schedules/${cellModal.existing.id}`);
    setCellModal(null);
    loadGrid();
  };

  // ===== Template default (waktu & jam ke- seperti jadwal master PDF) =====
  const [seeding, setSeeding] = useState(false);
  const handleSeedDefault = async () => {
    if (!confirm('Muat template default (waktu & jam ke- seperti jadwal master)? Semua baris jam & isian mapel yang sudah ada di tahun ajaran aktif akan DIGANTI total dengan template ini.')) return;
    setSeeding(true);
    try {
      await api.post('/periods/seed-default');
      await loadGrid();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat template default.');
    } finally {
      setSeeding(false);
    }
  };

  // ===== Export Word =====
  const handleExport = async () => {
    localStorage.setItem('jadwal_export_ttd', JSON.stringify(exportForm));
    setExporting(true);
    try {
      const res = await api.get('/schedules/export-word', { params: exportForm, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Jadwal-Pelajaran.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportModal(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-700 flex-1 min-w-[240px]">
          Susun struktur jam per hari (jam pelajaran biasa atau blok kegiatan khusus seperti istirahat/upacara), lalu isi mata pelajaran tiap kelas. Hasilnya bisa diekspor ke Word dalam format jadwal master.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={handleSeedDefault} disabled={seeding} className="text-xs text-ink-600 hover:text-brand-700 font-medium border border-line-200 rounded-lg px-3 py-2 flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" /> {seeding ? 'Memuat...' : 'Muat Template Default'}
          </button>
          <button onClick={() => setExportModal(true)} className="btn-primary whitespace-nowrap">
            <Download className="w-4 h-4" /> Export ke Word
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-mist-50 rounded-lg p-1 w-fit flex-wrap">
        {HARI_LIST.map((h) => (
          <button
            key={h}
            onClick={() => setSelectedDay(h)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${selectedDay === h ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
          >
            {HARI_LABEL[h]}
          </button>
        ))}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink-900">Jadwal {HARI_LABEL[selectedDay]}</h2>
          <button onClick={openAddPeriod} className="text-xs text-brand-600 hover:text-brand-800 font-medium border border-line-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tambah Baris Jam
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Waktu</th>
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Jam Ke</th>
                {classes.map((c) => (
                  <th key={c.id} className="pb-2 px-2 font-medium text-center whitespace-nowrap">{c.name}</th>
                ))}
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {periodsForDay.map((p) => (
                <tr key={p.id} className="border-t border-line-200">
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-ink-700">{p.waktu_mulai?.slice(0, 5)}-{p.waktu_selesai?.slice(0, 5)}</td>
                  <td className="pr-3 text-ink-700">{p.jam_ke || '-'}</td>
                  {p.tipe === 'khusus' ? (
                    <td colSpan={classes.length} className="px-2 text-center font-medium rounded" style={{ backgroundColor: p.warna || '#f1f5f9' }}>
                      {p.label_khusus}
                    </td>
                  ) : (
                    classes.map((c) => {
                      const s = scheduleFor(p.id, c.id);
                      return (
                        <td key={c.id} className="px-1">
                          <button
                            onClick={() => openCell(p, c)}
                            className={`w-full min-w-[42px] py-1.5 rounded-md text-xs font-medium transition ${s ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'bg-mist-50 text-ink-300 hover:bg-mist-100'}`}
                          >
                            {s ? (s.kode || s.subject?.kode || '?') : '+'}
                          </button>
                        </td>
                      );
                    })
                  )}
                  <td className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditPeriod(p)} className="text-ink-400 hover:text-brand-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePeriod(p)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {periodsForDay.length === 0 && (
                <tr><td colSpan={classes.length + 3} className="py-6 text-center text-ink-300">Belum ada baris jam untuk hari ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal: tambah/edit baris jam ===== */}
      {periodModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setPeriodModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2"><Clock className="w-4 h-4" /> {periodModal.editing ? 'Edit' : 'Tambah'} Baris Jam</h3>
              <button onClick={() => setPeriodModal(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePeriod} className="p-5 space-y-3">
              {periodError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{periodError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Jam ke (mis. 1, opsional)" value={periodForm.jam_ke} onChange={(e) => setPeriodForm({ ...periodForm, jam_ke: e.target.value })} className="field-input" />
                <select value={periodForm.tipe} onChange={(e) => setPeriodForm({ ...periodForm, tipe: e.target.value })} className="field-input text-ink-700">
                  <option value="pelajaran">Jam Pelajaran</option>
                  <option value="khusus">Kegiatan Khusus</option>
                </select>
                <input type="time" value={periodForm.waktu_mulai} onChange={(e) => setPeriodForm({ ...periodForm, waktu_mulai: e.target.value })} className="field-input" required />
                <input type="time" value={periodForm.waktu_selesai} onChange={(e) => setPeriodForm({ ...periodForm, waktu_selesai: e.target.value })} className="field-input" required />
              </div>
              {periodForm.tipe === 'khusus' && (
                <>
                  <input placeholder="Label (mis. ISTIRAHAT PERTAMA)" value={periodForm.label_khusus} onChange={(e) => setPeriodForm({ ...periodForm, label_khusus: e.target.value })} className="field-input w-full" required />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ink-500">Warna</label>
                    <input type="color" value={periodForm.warna} onChange={(e) => setPeriodForm({ ...periodForm, warna: e.target.value })} className="h-8 w-14 rounded border border-line-200" />
                  </div>
                </>
              )}
              <button disabled={periodSaving} className="btn-primary w-full justify-center">{periodSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal: isi mapel per sel ===== */}
      {cellModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setCellModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{cellModal.classRoom.name}</h3>
                <p className="text-xs text-ink-500">{HARI_LABEL[cellModal.period.hari]}, {cellModal.period.waktu_mulai?.slice(0, 5)}-{cellModal.period.waktu_selesai?.slice(0, 5)}</p>
              </div>
              <button onClick={() => setCellModal(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCell} className="p-5 space-y-3">
              {cellError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{cellError}</p>}
              <select value={cellForm.subject_id} onChange={(e) => setCellForm({ ...cellForm, subject_id: e.target.value })} className="field-input w-full text-ink-700" required>
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
              <select value={cellForm.teacher_id} onChange={(e) => setCellForm({ ...cellForm, teacher_id: e.target.value })} className="field-input w-full text-ink-700">
                <option value="">Guru (opsional)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
              </select>
              <input placeholder="Kode guru untuk tampil di grid (mis. D1)" value={cellForm.kode} onChange={(e) => setCellForm({ ...cellForm, kode: e.target.value })} className="field-input w-full" maxLength={10} />
              <div className="flex gap-2">
                <button disabled={cellSaving} className="btn-primary flex-1 justify-center">{cellSaving ? 'Menyimpan...' : 'Simpan'}</button>
                {cellModal.existing && (
                  <button type="button" onClick={handleDeleteCell} className="px-3 rounded-lg border border-line-200 text-honey-700 hover:bg-honey-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal: export Word ===== */}
      {exportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">Export ke Word</h3>
              <button onClick={() => setExportModal(false)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-ink-500">Data tanda tangan disimpan di perangkat ini, tidak perlu diisi ulang tiap export.</p>
              <input placeholder="Nama Kepala Sekolah" value={exportForm.kepsek_nama || ''} onChange={(e) => setExportForm({ ...exportForm, kepsek_nama: e.target.value })} className="field-input w-full" />
              <input placeholder="NIP Kepala Sekolah" value={exportForm.kepsek_nip || ''} onChange={(e) => setExportForm({ ...exportForm, kepsek_nip: e.target.value })} className="field-input w-full" />
              <input placeholder="Nama Waka Kurikulum" value={exportForm.waka_nama || ''} onChange={(e) => setExportForm({ ...exportForm, waka_nama: e.target.value })} className="field-input w-full" />
              <input placeholder="NBM Waka Kurikulum" value={exportForm.waka_nbm || ''} onChange={(e) => setExportForm({ ...exportForm, waka_nbm: e.target.value })} className="field-input w-full" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Tempat (mis. Sampit)" value={exportForm.tempat || ''} onChange={(e) => setExportForm({ ...exportForm, tempat: e.target.value })} className="field-input" />
                <input placeholder="Tanggal (opsional)" value={exportForm.tanggal || ''} onChange={(e) => setExportForm({ ...exportForm, tanggal: e.target.value })} className="field-input" />
              </div>
              <button onClick={handleExport} disabled={exporting} className="btn-primary w-full justify-center">
                <Download className="w-4 h-4" /> {exporting ? 'Mengunduh...' : 'Unduh Dokumen Word'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
