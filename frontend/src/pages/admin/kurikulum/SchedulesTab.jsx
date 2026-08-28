import { useEffect, useMemo, useState } from 'react';
import { Trash2, X, FileSpreadsheet, Wand2, AlertTriangle, Check } from 'lucide-react';
import api from '../../../api/axios';
import { useTahunAjaran, useTahunAjaranParam } from '../../../context/TahunAjaranContext';

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: "Jum'at", sabtu: 'Sabtu' };

export default function SchedulesTab() {
  const tahunParam = useTahunAjaranParam();
  const { isAktif: tahunAktif, selectedId: tahunAjaranIdTerpilih } = useTahunAjaran();
  const [selectedDay, setSelectedDay] = useState('senin');
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [armedAssignmentId, setArmedAssignmentId] = useState(null);
  const [placing, setPlacing] = useState(false);

  const [cellModal, setCellModal] = useState(null); // null | { period, classRoom, existing }
  const [cellKode, setCellKode] = useState('');
  const [cellError, setCellError] = useState('');
  const [cellSaving, setCellSaving] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportForm, setExportForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jadwal_export_ttd')) || {}; } catch { return {}; }
  });
  const [exporting, setExporting] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null); // null | { ditempatkan, gagal, message? }

  const loadGrid = () => api.get('/schedules/grid', { params: tahunParam }).then((res) => {
    setClasses(res.data.classes);
    setPeriods(res.data.periods);
    setSchedules(res.data.schedules);
    setAssignments(res.data.assignments);
    setSelectedClassId((prev) => prev ?? res.data.classes[0]?.id ?? null);
  }).catch(() => alert('Gagal memuat data jadwal.'));

  useEffect(() => { loadGrid(); }, [tahunAjaranIdTerpilih]); // eslint-disable-line
  // Reset status "siap tempatkan" cuma saat GANTI tahun ajaran (daftar
  // penugasannya berubah total) — bukan tiap loadGrid() dipanggil, supaya
  // sehabis 1 jam berhasil ditempatkan, penugasan yang sama tetap armed dan
  // bisa langsung klik "+" lagi buat jam berikutnya tanpa pilih ulang.
  useEffect(() => { setArmedAssignmentId(null); }, [tahunAjaranIdTerpilih]);

  const periodsForDay = periods.filter((p) => p.hari === selectedDay);
  const scheduleFor = (periodId, classId) => schedules.find((s) => s.period_id === periodId && s.class_room_id === classId);

  const keteranganGuru = useMemo(() => {
    return assignments
      .filter((a) => a.kode_guru)
      .map((a) => ({ id: a.id, kode_guru: a.kode_guru, guru: a.teacher?.user?.name || '-', mapel: a.subject?.nama || '-' }))
      .sort((a, b) => a.kode_guru.localeCompare(b.kode_guru));
  }, [assignments]);

  // Matriks JP: 1 baris per (guru, kelas) — kolomnya semua kelas, isi cuma
  // di kolom kelas baris itu. "Total" = JP guru itu di kelas itu saja;
  // "Total Jp" digabung (rowSpan) buat total keseluruhan guru itu di semua
  // kelas, ditulis 1x saja di baris pertamanya.
  const jpMatrix = useMemo(() => {
    // Dikelompokkan pakai teacher_id (bukan nama guru) — 2 guru dengan nama
    // sama persis (umum terjadi di nama Indonesia) sebelumnya tergabung
    // jadi 1 baris kalau dikelompokkan lewat nama, salah lapor jam
    // mengajar keduanya.
    const perGuruKelas = new Map();
    const totalPerGuru = new Map();
    const namaPerGuru = new Map();
    schedules.forEach((s) => {
      const guruId = s.teacher_id ?? 'null';
      namaPerGuru.set(guruId, s.teacher?.user?.name || 'Belum ada guru');
      const key = `${guruId}||${s.class_room_id}`;
      perGuruKelas.set(key, (perGuruKelas.get(key) || 0) + 1);
      totalPerGuru.set(guruId, (totalPerGuru.get(guruId) || 0) + 1);
    });

    const daftarGuru = [...totalPerGuru.keys()].sort((a, b) => namaPerGuru.get(a).localeCompare(namaPerGuru.get(b)));
    const baris = [];
    daftarGuru.forEach((guruId) => {
      const kelasUntukGuru = classes.filter((c) => perGuruKelas.has(`${guruId}||${c.id}`));
      kelasUntukGuru.forEach((c, idx) => {
        baris.push({
          guru: namaPerGuru.get(guruId),
          kelasId: c.id,
          jumlah: perGuruKelas.get(`${guruId}||${c.id}`),
          barisPertamaGuru: idx === 0,
          rowSpanGuru: kelasUntukGuru.length,
          totalGuru: totalPerGuru.get(guruId),
        });
      });
    });
    return baris;
  }, [classes, schedules]);

  const kelasTerpilih = classes.find((c) => c.id === selectedClassId);
  const assignmentsForClass = assignments.filter((a) => a.class_room_id === selectedClassId);
  const armedAssignment = assignments.find((a) => a.id === armedAssignmentId) || null;
  const armedPenuh = armedAssignment && armedAssignment.target_jam != null && armedAssignment.schedules_count >= armedAssignment.target_jam;

  const pilihKelas = (id) => {
    setSelectedClassId(id);
    setArmedAssignmentId(null);
  };

  const toggleArm = (a) => {
    const penuh = a.target_jam != null && a.schedules_count >= a.target_jam;
    if (penuh && armedAssignmentId !== a.id) return;
    setArmedAssignmentId((cur) => (cur === a.id ? null : a.id));
  };

  const handlePlace = async (period) => {
    if (!armedAssignment || placing) return;
    setPlacing(true);
    try {
      await api.post('/schedules', { period_id: period.id, teaching_assignment_id: armedAssignment.id });
      // Jam penugasan ini baru saja genap terpenuhi — lepas status "armed"
      // otomatis, supaya grid tidak terus menampilkan sel hijau yang
      // sebenarnya sudah tidak bisa diisi lagi (ditolak backend kalau
      // dipaksa klik).
      const jamBaru = (armedAssignment.schedules_count ?? 0) + 1;
      if (armedAssignment.target_jam != null && jamBaru >= armedAssignment.target_jam) {
        setArmedAssignmentId(null);
      }
      await loadGrid();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menempatkan jadwal.');
    } finally {
      setPlacing(false);
    }
  };

  // ===== Cell (lihat isian & hapus — isi baru cuma lewat "Tempatkan" di panel Tugas Mengajar) =====
  const openCell = (period, classRoom, existing) => {
    setCellKode(existing.kode || '');
    setCellError('');
    setCellModal({ period, classRoom, existing });
  };
  const handleSaveCellKode = async (e) => {
    e.preventDefault();
    setCellError(''); setCellSaving(true);
    try {
      await api.put(`/schedules/${cellModal.existing.id}`, { kode: cellKode });
      setCellModal(null);
      loadGrid();
    } catch (err) {
      setCellError(err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setCellSaving(false);
    }
  };
  const handleDeleteCell = async () => {
    if (!cellModal.existing) return;
    if (!confirm('Hapus isian jadwal ini? Jam yang sudah ditempatkan untuk penugasan ini akan berkurang.')) return;
    try {
      await api.delete(`/schedules/${cellModal.existing.id}`);
      setCellModal(null);
      loadGrid();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus isian jadwal.');
    }
  };

  // ===== Generate Otomatis =====
  // Isi sisa jam Tugas Mengajar yang belum ditempatkan ke slot kosong yang
  // valid (tidak bentrok kelas/guru, tidak melebihi Maks Jam Mengajar guru)
  // — isian yang SUDAH ada tidak disentuh sama sekali, jadi aman dijalankan
  // berkali-kali (idempotent buat bagian yang sudah terisi).
  const handleGenerateOtomatis = async () => {
    if (!confirm('Isi otomatis semua sisa jam Tugas Mengajar yang belum ditempatkan? Isian yang sudah ada tidak akan diubah/ditimpa — cuma slot kosong yang diisi.')) return;
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await api.post('/schedules/generate-otomatis');
      setGenerateResult(res.data);
      loadGrid();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menjalankan pengisian otomatis.');
    } finally {
      setGenerating(false);
    }
  };

  // ===== Export Excel =====
  const handleExport = async () => {
    localStorage.setItem('jadwal_export_ttd', JSON.stringify(exportForm));
    setExporting(true);
    try {
      const res = await api.get('/schedules/export-excel', { params: { ...exportForm, ...tahunParam }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Jadwal-Pelajaran.xlsx');
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
          {tahunAktif
            ? <>Struktur jam mengikuti menu <b>Template Jadwal</b> secara otomatis. Tempatkan Tugas Mengajar ke jam yang tersedia lewat panel di bawah — isian jadwal selalu mengikuti Tugas Mengajar, tidak bisa isi bebas mapel/guru lagi, supaya tidak ada guru yang kebentur jam mengajar di 2 kelas sekaligus.</>
            : 'Anda sedang melihat tahun ajaran lain (bukan yang aktif) — tempatkan/ubah/hapus isian jadwal dinonaktifkan di sini. Kembali ke tahun ajaran aktif di sidebar untuk mengubahnya.'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {tahunAktif && (
            <button onClick={handleGenerateOtomatis} disabled={generating} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 border border-brand-200 rounded-xl px-3.5 py-2 whitespace-nowrap">
              <Wand2 className="w-4 h-4" /> {generating ? 'Memproses...' : 'Generate Otomatis'}
            </button>
          )}
          <button onClick={() => setExportModal(true)} className="btn-primary whitespace-nowrap">
            <FileSpreadsheet className="w-4 h-4" /> Export ke Excel
          </button>
        </div>
      </div>

      {generateResult && (
        <div className="surface-card p-5 border-l-4 border-l-brand-400">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
              <Check className="w-4.5 h-4.5 text-brand-600" /> Hasil Generate Otomatis
            </h2>
            <button onClick={() => setGenerateResult(null)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-ink-700 mb-3">
            {generateResult.message || `${generateResult.ditempatkan} jam berhasil ditempatkan otomatis.`}
          </p>
          {generateResult.gagal?.length > 0 && (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Guru</th>
                    <th className="font-medium whitespace-nowrap px-2">Mapel</th>
                    <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                    <th className="font-medium text-right whitespace-nowrap px-2">Kurang</th>
                    <th className="font-medium whitespace-nowrap px-2">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {generateResult.gagal.map((g, i) => (
                    <tr key={i} className="border-t border-line-200">
                      <td className="py-2 text-ink-900 whitespace-nowrap px-2">{g.guru}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{g.mapel}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{g.kelas}</td>
                      <td className="text-right font-medium text-honey-700 whitespace-nowrap px-2">{g.kurang} jam</td>
                      <td className="text-ink-500 whitespace-nowrap px-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 text-honey-600" /> {g.alasan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-ink-400 mt-2">Sisa jam di atas belum tertempatkan — lengkapi manual lewat panel "Tempatkan Tugas Mengajar" di bawah, atau sesuaikan Maks Jam Mengajar gurunya di Master Data &gt; Guru.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Panel: pool Tugas Mengajar per kelas ===== */}
      {tahunAktif && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="font-display font-semibold text-ink-900">Tempatkan Tugas Mengajar</h2>
            <select
              value={selectedClassId || ''}
              onChange={(e) => pilihKelas(Number(e.target.value))}
              className="field-input text-sm text-ink-700 w-48"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-ink-500 mb-4">Pilih 1 penugasan, lalu klik jam kosong yang menyala hijau di tabel bawah pada kolom "{kelasTerpilih?.name}".</p>

          <div className="space-y-2">
            {assignmentsForClass.map((a) => {
              const penuh = a.target_jam != null && a.schedules_count >= a.target_jam;
              const armed = armedAssignmentId === a.id;
              return (
                <div key={a.id} className={`flex items-center justify-between gap-3 rounded-xl p-3 border transition ${armed ? 'border-brand-400 bg-brand-50' : 'border-line-200 bg-mist-50'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{a.subject?.nama}</p>
                    <p className="text-xs text-ink-500">{a.teacher?.user?.name || 'Belum ada guru'} · {a.schedules_count ?? 0}/{a.target_jam ?? '∞'} jam ditempatkan</p>
                  </div>
                  <button
                    onClick={() => toggleArm(a)}
                    disabled={penuh && !armed}
                    className={`shrink-0 text-xs font-medium rounded-lg px-3 py-1.5 whitespace-nowrap transition disabled:opacity-40 ${
                      armed ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-white border border-line-200 text-brand-700 hover:bg-brand-50'
                    }`}
                  >
                    {armed ? 'Batal' : penuh ? 'Jam Penuh' : 'Tempatkan'}
                  </button>
                </div>
              );
            })}
            {assignmentsForClass.length === 0 && (
              <p className="text-sm text-ink-300 text-center py-4">Belum ada Tugas Mengajar untuk kelas ini. Atur dulu di menu Tugas Mengajar.</p>
            )}
          </div>
        </div>
      )}

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
        <h2 className="font-display font-semibold text-ink-900 mb-4">Jadwal {HARI_LABEL[selectedDay]}</h2>

        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Waktu</th>
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Jam Ke</th>
                {classes.map((c) => (
                  <th key={c.id} className={`pb-2 px-2 font-medium text-center whitespace-nowrap ${c.id === selectedClassId ? 'text-brand-700' : ''}`}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodsForDay.map((p) => (
                <tr key={p.id} className="border-t border-line-200">
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-ink-700">{p.waktu_mulai?.slice(0, 5)}-{p.waktu_selesai?.slice(0, 5)}</td>
                  <td className="pr-3 text-ink-700 whitespace-nowrap">{p.jam_ke || '-'}</td>
                  {p.tipe === 'khusus' ? (
                    <td colSpan={classes.length} className="px-2 text-center font-medium rounded whitespace-nowrap" style={{ backgroundColor: p.warna || '#f1f5f9' }}>
                      {p.label_khusus}
                    </td>
                  ) : (
                    classes.map((c) => {
                      const s = scheduleFor(p.id, c.id);
                      if (s) {
                        return (
                          <td key={c.id} className="px-1 whitespace-nowrap">
                            <button
                              onClick={() => openCell(p, c, s)}
                              className="w-full min-w-[42px] py-1.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition"
                            >
                              {s.kode || s.subject?.kode || '?'}
                            </button>
                          </td>
                        );
                      }
                      if (armedAssignment && !armedPenuh && c.id === armedAssignment.class_room_id) {
                        const guruBentrok = armedAssignment.teacher_id && schedules.some((sc) => sc.period_id === p.id && sc.teacher_id === armedAssignment.teacher_id);
                        if (guruBentrok) {
                          return (
                            <td key={c.id} className="px-1 whitespace-nowrap">
                              <div title="Guru penugasan ini sudah mengajar kelas lain di jam ini" className="w-full min-w-[42px] py-1.5 rounded-md text-xs text-center bg-rose-50 text-rose-300 cursor-not-allowed">✕</div>
                            </td>
                          );
                        }
                        return (
                          <td key={c.id} className="px-1 whitespace-nowrap">
                            <button
                              onClick={() => handlePlace(p)}
                              disabled={placing}
                              title="Tempatkan di sini"
                              className="w-full min-w-[42px] py-1.5 rounded-md text-xs font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 ring-2 ring-brand-400 transition disabled:opacity-50"
                            >
                              +
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={c.id} className="px-1 whitespace-nowrap">
                          <div className="w-full min-w-[42px] py-1.5 rounded-md text-xs text-center text-ink-200">·</div>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
              {periodsForDay.length === 0 && (
                <tr><td colSpan={classes.length + 2} className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada baris jam untuk hari ini — atur dulu di menu Template Jadwal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Keterangan Kode Guru</h2>
        <p className="text-xs text-ink-500 mb-4">Penjelasan tiap kode yang tampil di grid jadwal — dibuat lewat tombol "Generate Kode Guru A-Z" di menu Tugas Mengajar.</p>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Kode Guru</th>
                <th className="pr-3 font-medium whitespace-nowrap">Nama Guru</th>
                <th className="font-medium whitespace-nowrap px-2">Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody>
              {keteranganGuru.map((k) => (
                <tr key={k.id} className="border-t border-line-200">
                  <td className="py-2 pr-3 whitespace-nowrap"><span className="badge-soft badge-brand font-mono">{k.kode_guru}</span></td>
                  <td className="pr-3 text-ink-900 whitespace-nowrap">{k.guru}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{k.mapel}</td>
                </tr>
              ))}
              {keteranganGuru.length === 0 && (
                <tr><td colSpan="3" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada Kode Guru — generate dulu di menu Tugas Mengajar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">JP Guru per Kelas</h2>
        <p className="text-xs text-ink-500 mb-4">Rincian jam pelajaran (JP) tiap guru di tiap kelas, beserta totalnya, di tahun ajaran aktif.</p>
        <div className="table-scroll">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Nama</th>
                {classes.map((c) => (
                  <th key={c.id} className="font-medium text-center px-2 whitespace-nowrap">{c.name}</th>
                ))}
                <th className="font-medium text-center px-2 whitespace-nowrap">total</th>
                <th className="font-medium text-center px-2 whitespace-nowrap">Total Jp</th>
              </tr>
            </thead>
            <tbody>
              {jpMatrix.map((row, i) => (
                <tr key={i} className="border-t border-line-200">
                  <td className="py-2 pr-3 text-ink-900 whitespace-nowrap">{row.guru}</td>
                  {classes.map((c) => (
                    <td key={c.id} className="text-center text-ink-700 px-2 whitespace-nowrap">{c.id === row.kelasId ? row.jumlah : ''}</td>
                  ))}
                  <td className="text-center text-ink-900 font-medium px-2 whitespace-nowrap">{row.jumlah}</td>
                  {row.barisPertamaGuru && (
                    <td rowSpan={row.rowSpanGuru} className="text-center font-semibold text-brand-700 px-2 align-middle border-l border-line-200 whitespace-nowrap">{row.totalGuru} Jp</td>
                  )}
                </tr>
              ))}
              {jpMatrix.length === 0 && (
                <tr><td colSpan={classes.length + 3} className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada jadwal ditempatkan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal: lihat isian sel + ubah kode + hapus ===== */}
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
            {tahunAktif ? (
              <form onSubmit={handleSaveCellKode} className="p-5 space-y-3">
                {cellError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{cellError}</p>}
                <div className="rounded-lg bg-mist-50 border border-line-200 px-3 py-2.5">
                  <p className="text-sm font-medium text-ink-900">{cellModal.existing.subject?.nama}</p>
                  <p className="text-xs text-ink-500">{cellModal.existing.teacher?.user?.name || 'Belum ada guru'}</p>
                </div>
                <input placeholder="Kode guru untuk tampil di grid (mis. D1)" value={cellKode} onChange={(e) => setCellKode(e.target.value)} className="field-input w-full" maxLength={10} />
                <div className="flex gap-2">
                  <button disabled={cellSaving} className="btn-primary flex-1 justify-center">{cellSaving ? 'Menyimpan...' : 'Simpan'}</button>
                  <button type="button" onClick={handleDeleteCell} className="px-3 rounded-lg border border-line-200 text-honey-700 hover:bg-honey-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-3">
                <div className="rounded-lg bg-mist-50 border border-line-200 px-3 py-2.5">
                  <p className="text-sm font-medium text-ink-900">{cellModal.existing.subject?.nama}</p>
                  <p className="text-xs text-ink-500">{cellModal.existing.teacher?.user?.name || 'Belum ada guru'}</p>
                  {cellModal.existing.kode && <p className="text-xs text-ink-500 mt-1">Kode: <span className="font-mono">{cellModal.existing.kode}</span></p>}
                </div>
                <p className="text-xs text-ink-400">Isian tahun ajaran lain bersifat lihat-saja — tidak bisa diubah/dihapus di sini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal: export Excel ===== */}
      {exportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-line-200">
              <h3 className="font-display font-semibold text-ink-900">Export ke Excel</h3>
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
                <FileSpreadsheet className="w-4 h-4" /> {exporting ? 'Mengunduh...' : 'Unduh Dokumen Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
