import { useEffect, useState } from 'react';
import { Plus, Trash2, ClipboardList, PowerOff } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import DateInput from '../../../../components/DateInput';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';
import { fmtDMY } from '../../../../utils/date';
import { useAuth } from '../../../../context/AuthContext';
import { useTahunAjaran, useTahunAjaranParam } from '../../../../context/TahunAjaranContext';

// Dipakai supaya tanggal mulai/selesai batch berikutnya tidak perlu ketik
// ulang — kebanyakan sekolah cuma punya 1 periode PKL per tahun ajaran,
// jadi begitu terisi sekali, batch-batch berikutnya (kelas/IDUKA lain)
// otomatis kepakai tanggal yang sama, tinggal diubah kalau memang beda.
const JADWAL_TERAKHIR_KEY = 'pkl_bulk_jadwal_terakhir';

export default function PenempatanTab() {
  const { user } = useAuth();
  // Waka Humas cuma boleh baca data penempatan PKL (buat data IDUKA-nya
  // sendiri) — yang boleh buat/ubah/hapus penempatan cuma admin & Waka
  // Kurikulum, sesuai pembagian tanggung jawab yang backend-nya juga sudah
  // batasi (POST/PUT/DELETE /pkl-placements ditolak buat waka_humas).
  const canEdit = user.role === 'admin' || user.role === 'waka_kurikulum';
  const tahunParam = useTahunAjaranParam();
  const { isAktif: tahunAktif, selectedId: tahunAjaranId } = useTahunAjaran();
  const [list, setList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [dudiList, setDudiList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [closingAll, setClosingAll] = useState(false);
  const [aktifCount, setAktifCount] = useState(0);
  const [aktifStudentIds, setAktifStudentIds] = useState(new Set());
  const [activatingAll, setActivatingAll] = useState(false);
  const [selesaiCount, setSelesaiCount] = useState(0);

  // ===== Roster kelas + centang massal =====
  const [rosterClassId, setRosterClassId] = useState('');
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDudiId, setBulkDudiId] = useState('');
  const [bulkGuruId, setBulkGuruId] = useState('');
  const [bulkTanggalMulai, setBulkTanggalMulai] = useState('');
  const [bulkTanggalSelesai, setBulkTanggalSelesai] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const load = () => {
    const params = { ...tahunParam };
    if (filterStatus) params.status = filterStatus;
    return api.get('/pkl-placements', { params }).then((res) => setList(res.data));
  };

  // Dihitung terpisah dari daftar yang tampil, supaya tetap akurat walau
  // tabelnya sedang difilter ke status tertentu (misal cuma "Selesai").
  // Daftar student_id-nya sekalian dipakai roster di bawah, buat menandai
  // siswa yang sudah punya penempatan aktif (checkbox-nya dikunci).
  const loadAktifCount = () => {
    return api.get('/pkl-placements', { params: { status: 'aktif' } }).then((res) => {
      setAktifCount(res.data.length);
      setAktifStudentIds(new Set(res.data.map((p) => p.student_id)));
    });
  };

  const loadSelesaiCount = () => {
    return api.get('/pkl-placements', { params: { status: 'selesai' } }).then((res) => setSelesaiCount(res.data.length));
  };

  const handleTutupSemuaAktif = async () => {
    if (aktifCount === 0) return;
    if (!confirm(
      `Anda akan menutup ${aktifCount} penempatan PKL yang masih aktif (ditandai "Selesai").\n\n` +
      `Semua riwayat absensi, jurnal, dan penilaian IDUKA yang sudah ada TIDAK akan terhapus — tetap bisa dibuka lagi kapan saja.\n\n` +
      `Setelah ini, Anda bisa membuat penempatan baru untuk periode PKL berikutnya. Lanjutkan?`
    )) return;

    setClosingAll(true);
    try {
      const res = await api.post('/pkl-placements/tutup-semua-aktif');
      alert(res.data.message);
      load();
      loadAktifCount();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menutup penempatan.');
    } finally {
      setClosingAll(false);
    }
  };

  const handleAktifkanSemuaSelesai = async () => {
    if (selesaiCount === 0) return;
    if (!confirm(
      `Anda akan mengaktifkan kembali ${selesaiCount} penempatan PKL yang berstatus "Selesai" jadi "Aktif" lagi.\n\n` +
      `Lanjutkan?`
    )) return;

    setActivatingAll(true);
    try {
      const res = await api.post('/pkl-placements/aktifkan-semua-selesai');
      alert(res.data.message);
      load();
      loadAktifCount();
      loadSelesaiCount();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan penempatan.');
    } finally {
      setActivatingAll(false);
    }
  };

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/dudi').then((res) => setDudiList(res.data));
    api.get('/teachers').then((res) => setTeachers(res.data));

    try {
      const saved = JSON.parse(localStorage.getItem(JADWAL_TERAKHIR_KEY) || 'null');
      if (saved?.tanggal_mulai) setBulkTanggalMulai(saved.tanggal_mulai);
      if (saved?.tanggal_selesai) setBulkTanggalSelesai(saved.tanggal_selesai);
    } catch {
      // abaikan — kalau isinya rusak, cukup mulai kosong seperti biasa
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load() didefinisikan ulang tiap render, sengaja tidak dimasukkan ke deps
  useEffect(() => { load(); }, [filterStatus, tahunAjaranId]);
  useEffect(() => { loadAktifCount(); }, []);
  useEffect(() => { loadSelesaiCount(); }, []);

  const loadRoster = (classRoomId) => {
    if (!classRoomId) { setRosterStudents([]); return; }
    setRosterLoading(true);
    api.get('/students', { params: { class_room_id: classRoomId } })
      .then((res) => setRosterStudents(res.data))
      .finally(() => setRosterLoading(false));
  };

  useEffect(() => { loadRoster(rosterClassId); }, [rosterClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const siswaBisaDipilih = rosterStudents.filter((s) => !aktifStudentIds.has(s.id));
  const semuaTerpilih = siswaBisaDipilih.length > 0 && siswaBisaDipilih.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    setSelectedIds(semuaTerpilih ? new Set() : new Set(siswaBisaDipilih.map((s) => s.id)));
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBulkResult(null);
    if (selectedIds.size === 0) {
      setError('Pilih minimal 1 siswa dulu.');
      return;
    }
    setBulkSaving(true);
    try {
      const res = await api.post('/pkl-placements/bulk', {
        student_ids: [...selectedIds],
        dudi_id: bulkDudiId,
        guru_pembimbing_id: bulkGuruId || undefined,
        tanggal_mulai: bulkTanggalMulai,
        tanggal_selesai: bulkTanggalSelesai,
      });
      setBulkResult(res.data);
      localStorage.setItem(JADWAL_TERAKHIR_KEY, JSON.stringify({ tanggal_mulai: bulkTanggalMulai, tanggal_selesai: bulkTanggalSelesai }));
      setSelectedIds(new Set());
      setBulkDudiId('');
      load();
      loadAktifCount();
      loadRoster(rosterClassId);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal membuat penempatan.');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleUbahStatus = async (p, status) => {
    const label = status === 'selesai' ? 'menandai selesai' : 'mengaktifkan kembali';
    if (!confirm(`Yakin ${label} penempatan PKL "${p.student?.user?.name}"?`)) return;
    try {
      await api.put(`/pkl-placements/${p.id}`, { status });
      load();
      loadAktifCount();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status.');
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus penempatan PKL "${p.student?.user?.name}" di "${p.dudi?.nama_perusahaan}"? Seluruh riwayat absensi PKL-nya juga akan terhapus.`)) return;
    try {
      await api.delete(`/pkl-placements/${p.id}`);
      load();
      loadAktifCount();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <ClipboardList className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Setiap siswa hanya boleh punya 1 penempatan berstatus <b>aktif</b> di satu waktu. Begitu penempatan aktif dibuat, menu PKL otomatis muncul di dashboard siswa (menggantikan QR barcode), guru pembimbing, dan IDUKA terkait.
        </p>
      </div>

      {canEdit && (
        <form onSubmit={handleBulkSubmit} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Buat Penempatan PKL</h2>
          <p className="text-xs text-ink-500 mb-4">
            Pilih kelas, centang siswa yang mau ditempatkan (boleh 1 atau banyak sekaligus), lalu isi IDUKA &amp; jadwalnya sekali untuk semua siswa yang dicentang.
          </p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          {bulkResult && (
            <div className="text-sm bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-brand-700 font-medium">{bulkResult.message}</p>
              {bulkResult.dilewati?.length > 0 && (
                <p className="text-ink-500 text-xs mt-1">Dilewati (sudah aktif PKL): {bulkResult.dilewati.join(', ')}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
            <select
              value={rosterClassId}
              onChange={(e) => { setRosterClassId(e.target.value); setSelectedIds(new Set()); }}
              className="field-input text-ink-700 max-w-xs"
            >
              <option value="">— Pilih Kelas —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {rosterClassId && (
            <div className="mb-4 border border-line-200 rounded-xl max-h-80 overflow-y-auto table-scroll">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 pt-2 pl-3 w-10">
                      <input type="checkbox" checked={semuaTerpilih} onChange={toggleSelectAll} disabled={siswaBisaDipilih.length === 0} />
                    </th>
                    <th className="font-medium whitespace-nowrap px-2 pt-2">Siswa</th>
                    <th className="font-medium whitespace-nowrap px-2 pt-2">NIS</th>
                    <th className="font-medium whitespace-nowrap px-2 pt-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterLoading ? (
                    <tr><td colSpan="4" className="py-4 text-center text-ink-300">Memuat...</td></tr>
                  ) : rosterStudents.length === 0 ? (
                    <tr><td colSpan="4" className="py-4 text-center text-ink-300">Tidak ada siswa aktif di kelas ini.</td></tr>
                  ) : rosterStudents.map((s) => {
                    const sudahAktif = aktifStudentIds.has(s.id);
                    return (
                      <tr key={s.id} className="border-t border-line-200">
                        <td className="pl-3 py-2">
                          <input type="checkbox" checked={selectedIds.has(s.id)} disabled={sudahAktif} onChange={() => toggleSelected(s.id)} />
                        </td>
                        <td className="py-2 px-2 text-ink-900 whitespace-nowrap"><TruncateText text={s.user?.name} /></td>
                        <td className="px-2 text-ink-500 whitespace-nowrap">{s.nis}</td>
                        <td className="px-2 whitespace-nowrap">
                          {sudahAktif
                            ? <span className="badge-soft badge-brand">Sudah PKL</span>
                            : <span className="text-xs text-ink-300">Belum</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <select value={bulkDudiId} onChange={(e) => setBulkDudiId(e.target.value)} className="field-input text-ink-700" required>
              <option value="">— Pilih IDUKA —</option>
              {dudiList.map((d) => (
                <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>
              ))}
            </select>
            <select value={bulkGuruId} onChange={(e) => setBulkGuruId(e.target.value)} className="field-input text-ink-700">
              <option value="">— Pilih Guru Pembimbing (opsional) —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.user?.name}</option>
              ))}
            </select>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Mulai</label>
              <DateInput value={bulkTanggalMulai} onChange={(e) => setBulkTanggalMulai(e.target.value)} className="field-input w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Selesai</label>
              <DateInput value={bulkTanggalSelesai} onChange={(e) => setBulkTanggalSelesai(e.target.value)} className="field-input w-full" required />
            </div>
          </div>
          <button disabled={bulkSaving || selectedIds.size === 0} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> {bulkSaving ? 'Menyimpan...' : `Buat Penempatan (${selectedIds.size} siswa)`}
          </button>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <h2 className="font-display font-semibold text-ink-900">
            Daftar Penempatan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="field-input text-sm text-ink-700 w-40">
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="selesai">Selesai</option>
            </select>
            {canEdit && (
              <button
                onClick={handleTutupSemuaAktif}
                disabled={closingAll || aktifCount === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 disabled:opacity-40 border border-honey-200 rounded-xl px-3 py-2 transition whitespace-nowrap"
                title="Tutup semua penempatan yang masih aktif (ditandai Selesai) — data riwayatnya tetap tersimpan."
              >
                <PowerOff className="w-4 h-4" /> Tutup PKL ({aktifCount})
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleAktifkanSemuaSelesai}
                disabled={activatingAll || selesaiCount === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 disabled:opacity-40 border border-brand-200 rounded-xl px-3 py-2 transition whitespace-nowrap"
                title="Aktifkan kembali semua penempatan yang berstatus Selesai."
              >
                <PowerOff className="w-4 h-4 rotate-180" /> Aktif PKL ({selesaiCount})
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-400 mb-4">
          {tahunAktif
            ? 'Cuma menampilkan penempatan tahun ajaran yang sedang aktif.'
            : 'Menampilkan penempatan tahun ajaran yang dipilih di sidebar.'}
          {' '}Data tahun ajaran sebelumnya tidak dihapus, cuma disembunyikan dari daftar ini.
        </p>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Siswa</th>
              <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
              <th className="font-medium whitespace-nowrap px-2">Pembimbing</th>
              <th className="font-medium whitespace-nowrap px-2">Periode</th>
              <th className="font-medium whitespace-nowrap px-2">Status</th>
              {canEdit && <th className="pb-2 w-20 whitespace-nowrap px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {listHalaman.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5 whitespace-nowrap px-2">
                  <p className="text-ink-900 font-medium"><TruncateText text={p.student?.user?.name} /></p>
                  <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                </td>
                <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.dudi?.nama_perusahaan} /></td>
                <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.guru_pembimbing?.user?.name} /></td>
                <td className="text-ink-700 text-xs whitespace-nowrap px-2">{fmtDMY(p.tanggal_mulai)} s/d {fmtDMY(p.tanggal_selesai)}</td>
                <td className="whitespace-nowrap px-2">
                  {canEdit ? (
                    <button onClick={() => handleUbahStatus(p, p.status === 'aktif' ? 'selesai' : 'aktif')}>
                      <span className={`badge-soft ${p.status === 'aktif' ? 'badge-brand' : 'badge-soft'}`}>
                        {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                      </span>
                    </button>
                  ) : (
                    <span className={`badge-soft ${p.status === 'aktif' ? 'badge-brand' : 'badge-soft'}`}>
                      {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="text-right whitespace-nowrap px-2">
                    <button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="6" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada penempatan PKL.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

    </div>
  );
}
