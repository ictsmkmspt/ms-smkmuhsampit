import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import { fmtDMY } from '../../../../utils/date';
import { useTahunAjaran, useTahunAjaranParam } from '../../../../context/TahunAjaranContext';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Laporan PKL > Monitoring Guru — rekap jurnal kunjungan/bimbingan PKL,
 * bisa disaring per guru pendamping. Dropdown guru langsung berisi guru
 * yang SEDANG ditugaskan sebagai pembimbing PKL saja (bukan semua guru
 * sekolah) lewat /pkl-placements/guru-pembimbing, ikut tombol pemilih
 * tahun ajaran di sidebar (bukan selalu tahun aktif) — supaya kalau
 * sedang melihat tahun ajaran lama, daftar gurunya juga guru yang
 * membimbing di tahun itu. Jurnal kunjungannya sendiri (pkl-pembimbingan)
 * memang tidak terikat tahun ajaran (tidak ada kolomnya), jadi tidak ikut
 * disaring tahun ajaran. Filter TIDAK langsung mengubah tabel — nunggu
 * klik "Tampilkan" dulu, sama seperti Kegiatan Siswa di sebelah.
 */
export default function MonitoringGuruReportTab() {
  const tahunParam = useTahunAjaranParam();
  const { selectedId: tahunAjaranId } = useTahunAjaran();
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [jadwalList, setJadwalList] = useState([]);
  const [allEntries, setAllEntries] = useState([]);

  useEffect(() => {
    setTeacherId('');
    api.get('/pkl-placements/guru-pembimbing', { params: tahunParam }).then((res) => setTeachers(res.data));
    api.get('/pkl-monitoring-jadwal', { params: tahunParam }).then((res) => setJadwalList(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load ulang kalau tahun ajaran pilihan sidebar berubah; guru terpilih direset karena bisa jadi tidak relevan lagi di tahun yang baru dipilih
  }, [tahunAjaranId]);

  // Dipakai KHUSUS untuk rekap "Status Monitoring per Jadwal" di bawah —
  // sengaja TIDAK ikut filter Guru Pendamping (beda dari `list`), supaya
  // rekapnya selalu menghitung SEMUA guru pembimbing, bukan cuma yang lagi
  // difilter di tabel jurnal.
  useEffect(() => {
    api.get('/pkl-pembimbingan').then((res) => setAllEntries(res.data));
  }, []);

  const load = () => {
    setLoading(true);
    const params = {};
    if (teacherId) params.teacher_id = teacherId;
    api.get('/pkl-pembimbingan', { params })
      .then((res) => { setList(res.data); setLoaded(true); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya load sekali saat mount, perubahan filter dipicu manual lewat tombol Tampilkan
  useEffect(() => { load(); }, []);

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 30);

  const today = hariIniIso();
  const jadwalStatus = useMemo(() => {
    return jadwalList.map((j) => {
      const selesai = j.tanggal_selesai || j.tanggal_rencana;
      const status = selesai < today ? 'lewat' : (j.tanggal_rencana <= today && today <= selesai) ? 'berlangsung' : 'akan_datang';
      const guruSudahIds = new Set(
        allEntries.filter((e) => e.aktivitas === j.judul).map((e) => e.teacher_id)
      );
      const guruBelum = teachers.filter((t) => !guruSudahIds.has(t.id));
      const guruSudah = teachers.filter((t) => guruSudahIds.has(t.id));
      return { ...j, status, jumlahSudah: guruSudahIds.size, guruBelum, guruSudah };
    });
  }, [jadwalList, allEntries, teachers, today]);

  const [detailJadwal, setDetailJadwal] = useState(null);

  const totalKunjungan = list.length;
  const totalVerified = list.filter((j) => j.verified_at).length;
  const totalPending = totalKunjungan - totalVerified;

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Guru Pendamping PKL</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="field-input text-ink-700 min-w-[14rem]">
            <option value="">Semua Guru</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} className="btn-primary">
          <Search className="w-4 h-4" /> {loading ? 'Memuat...' : 'Tampilkan'}
        </button>

        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-brand">Total Kunjungan: {totalKunjungan}</span>
          <span className="badge-soft badge-brand">Terverifikasi: {totalVerified}</span>
          <span className="badge-soft badge-honey">Belum Diverifikasi: {totalPending}</span>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Status Monitoring per Jadwal</h2>
        <p className="text-xs text-ink-500 mb-4">
          Dicocokkan dari Jurnal Kunjungan/Bimbingan yang aktivitasnya sesuai judul jadwal — guru yang belum lapor untuk jadwal itu langsung terlihat di bawah.
        </p>
        {jadwalStatus.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada Jadwal Monitoring yang ditetapkan.</p>
        ) : (
          <div className="divide-y divide-line-200">
            {jadwalStatus.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{j.judul}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {fmtDMY(j.tanggal_rencana)}{j.tanggal_selesai && j.tanggal_selesai !== j.tanggal_rencana ? ` s/d ${fmtDMY(j.tanggal_selesai)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge-soft ${j.status === 'lewat' ? 'badge-rose' : j.status === 'berlangsung' ? 'badge-brand' : 'badge-honey'}`}>
                    {j.status === 'lewat' ? 'Sudah lewat' : j.status === 'berlangsung' ? 'Berlangsung' : 'Akan datang'}
                  </span>
                  <span className={`badge-soft ${j.guruBelum.length === 0 ? 'badge-brand' : 'badge-honey'}`}>{j.jumlahSudah}/{teachers.length} sudah lapor</span>
                  <button onClick={() => setDetailJadwal(j)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDetailJadwal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-line-200 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-ink-900">{detailJadwal.judul}</h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  {fmtDMY(detailJadwal.tanggal_rencana)}{detailJadwal.tanggal_selesai && detailJadwal.tanggal_selesai !== detailJadwal.tanggal_rencana ? ` s/d ${fmtDMY(detailJadwal.tanggal_selesai)}` : ''}
                </p>
              </div>
              <button onClick={() => setDetailJadwal(null)} className="text-ink-300 hover:text-ink-600 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {teachers.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-4">Belum ada guru pembimbing PKL.</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-ink-500 mb-2">Belum lapor ({detailJadwal.guruBelum.length})</p>
                    {detailJadwal.guruBelum.length === 0 ? (
                      <p className="text-xs text-brand-700">Semua guru pembimbing sudah lapor untuk jadwal ini.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {detailJadwal.guruBelum.map((t) => (
                          <span key={t.id} className="badge-soft badge-honey">{t.user?.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {detailJadwal.guruSudah.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-2">Sudah lapor ({detailJadwal.guruSudah.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detailJadwal.guruSudah.map((t) => (
                          <span key={t.id} className="badge-soft badge-brand">{t.user?.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Jurnal Kunjungan/Bimbingan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
        </h2>
        {!loaded ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                  <th className="font-medium whitespace-nowrap px-2">Guru</th>
                  <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
                  <th className="font-medium whitespace-nowrap px-2">Aktivitas</th>
                  <th className="font-medium whitespace-nowrap px-2">Catatan</th>
                  <th className="font-medium whitespace-nowrap px-2">Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {listHalaman.map((j) => (
                  <tr key={j.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-700 text-xs whitespace-nowrap px-2">{fmtDMY(j.date)}</td>
                    <td className="text-ink-900 font-medium whitespace-nowrap px-2"><TruncateText text={j.teacher?.user?.name} /></td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={j.dudi?.nama_perusahaan} /></td>
                    <td className="text-ink-700 px-2"><TruncateText text={j.aktivitas} maxWidth="16rem" /></td>
                    <td className="text-ink-500 px-2"><TruncateText text={j.catatan || '-'} maxWidth="12rem" /></td>
                    <td className="whitespace-nowrap px-2">
                      <span className={`badge-soft ${j.verified_at ? 'badge-brand' : 'badge-honey'}`}>
                        {j.verified_at ? 'Terverifikasi' : 'Belum'}
                      </span>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="6" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada jurnal bimbingan untuk filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {loaded && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}
