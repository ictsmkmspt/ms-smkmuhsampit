import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import { fmtDMY } from '../../../../utils/date';
import { useTahunAjaran, useTahunAjaranParam } from '../../../../context/TahunAjaranContext';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';

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

  useEffect(() => {
    setTeacherId('');
    api.get('/pkl-placements/guru-pembimbing', { params: tahunParam }).then((res) => setTeachers(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load ulang kalau tahun ajaran pilihan sidebar berubah; guru terpilih direset karena bisa jadi tidak relevan lagi di tahun yang baru dipilih
  }, [tahunAjaranId]);

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
