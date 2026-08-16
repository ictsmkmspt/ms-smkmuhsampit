import { useEffect, useState } from 'react';
import { Search, ClipboardCheck, NotebookPen, Award } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import { fmtDMY } from '../../../../utils/date';
import { useTahunAjaran, useTahunAjaranParam } from '../../../../context/TahunAjaranContext';
import Pagination from '../../../../components/Pagination';
import usePagination from '../../../../hooks/usePagination';

const INNER_TABS = [
  { key: 'absensi', label: 'Absensi', icon: ClipboardCheck },
  { key: 'jurnal', label: 'Jurnal Kegiatan', icon: NotebookPen },
  { key: 'nilai', label: 'Nilai per Siswa', icon: Award },
];

/**
 * Laporan PKL > Kegiatan Siswa — disaring per penempatan IDUKA (dan status
 * aktif/selesai), dengan 3 tampilan: Absensi (rekap hadir/izin/sakit/alpa),
 * Jurnal Kegiatan (isi jurnal harian siswa apa adanya, bukan rekap angka),
 * & Nilai per Siswa (nilai_akhir dari IDUKA). Filter TIDAK langsung
 * mengubah tabel — nunggu klik "Tampilkan" dulu, sama seperti pola di
 * menu Tagihan SPP/Tagihan Lain TU.
 */
export default function KegiatanSiswaReportTab() {
  const tahunParam = useTahunAjaranParam();
  const { isAktif: tahunAktif } = useTahunAjaran();
  const [innerTab, setInnerTab] = useState('absensi');

  const [dudiList, setDudiList] = useState([]);
  const [dudiId, setDudiId] = useState('');
  const [status, setStatus] = useState('');

  const [absensi, setAbsensi] = useState([]);
  const [jurnal, setJurnal] = useState([]);
  const [nilai, setNilai] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/dudi').then((res) => setDudiList(res.data));
  }, []);

  const loadAll = () => {
    setLoading(true);
    const params = { ...tahunParam };
    if (dudiId) params.dudi_id = dudiId;
    if (status) params.status = status;

    Promise.all([
      api.get('/pkl-attendances/report', { params }),
      api.get('/pkl-jurnal/report', { params }),
      api.get('/pkl-placements', { params }),
    ])
      .then(([resAbsensi, resJurnal, resNilai]) => {
        setAbsensi(resAbsensi.data);
        setJurnal(resJurnal.data);
        setNilai(resNilai.data);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya load sekali saat mount, perubahan filter dipicu manual lewat tombol Tampilkan
  useEffect(() => { loadAll(); }, []);

  const absensiPage = usePagination(absensi, 30);
  const jurnalPage = usePagination(jurnal, 30);
  const nilaiPage = usePagination(nilai, 30);

  const jumlahDinilai = nilai.filter((p) => p.penilaian).length;
  const rataRataNilai = jumlahDinilai
    ? Math.round(nilai.reduce((sum, p) => sum + (p.penilaian ? Number(p.nilai_akhir || 0) : 0), 0) / jumlahDinilai)
    : null;

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Penempatan IDUKA</label>
          <select value={dudiId} onChange={(e) => setDudiId(e.target.value)} className="field-input text-ink-700 min-w-[12rem]">
            <option value="">Semua IDUKA</option>
            {dudiList.map((d) => <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
        <button onClick={loadAll} disabled={loading} className="btn-primary">
          <Search className="w-4 h-4" /> {loading ? 'Memuat...' : 'Tampilkan'}
        </button>
      </div>

      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 w-fit">
        {INNER_TABS.map((t) => {
          const isActive = innerTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setInnerTab(t.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <p className="text-center text-ink-300 py-6">Memuat...</p>
      ) : innerTab === 'absensi' ? (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="font-display font-semibold text-ink-900">
              Absensi <span className="text-ink-500 font-sans font-normal text-sm">({absensi.length} siswa)</span>
            </h2>
          </div>
          <p className="text-xs text-ink-400 mb-4">
            {tahunAktif ? 'Menampilkan penempatan tahun ajaran yang sedang aktif.' : 'Menampilkan penempatan tahun ajaran yang dipilih di sidebar.'}
          </p>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Siswa</th>
                  <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
                  <th className="font-medium whitespace-nowrap px-2">Pembimbing</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Hadir</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Izin</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Sakit</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Alpa</th>
                </tr>
              </thead>
              <tbody>
                {absensiPage.paginated.map((p) => (
                  <tr key={p.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2">
                      <p className="text-ink-900 font-medium"><TruncateText text={p.student?.user?.name} /></p>
                      <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                    </td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.dudi?.nama_perusahaan} /></td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.guru_pembimbing?.user?.name || '-'} /></td>
                    <td className="text-center whitespace-nowrap px-2"><span className="badge-soft badge-brand">{p.rekap_absensi?.hadir ?? 0}</span></td>
                    <td className="text-center whitespace-nowrap px-2"><span className="badge-soft badge-honey">{p.rekap_absensi?.izin ?? 0}</span></td>
                    <td className="text-center whitespace-nowrap px-2"><span className="badge-soft badge-honey">{p.rekap_absensi?.sakit ?? 0}</span></td>
                    <td className="text-center whitespace-nowrap px-2"><span className="badge-soft badge-rose">{p.rekap_absensi?.alpa ?? 0}</span></td>
                  </tr>
                ))}
                {absensi.length === 0 && (
                  <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada penempatan PKL untuk filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={absensiPage.page} totalPages={absensiPage.totalPages} onChange={absensiPage.setPage} />
        </div>
      ) : innerTab === 'jurnal' ? (
        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">
            Jurnal Kegiatan <span className="text-ink-500 font-sans font-normal text-sm">({jurnal.length})</span>
          </h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                  <th className="font-medium whitespace-nowrap px-2">Siswa</th>
                  <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
                  <th className="font-medium whitespace-nowrap px-2">Kegiatan</th>
                  <th className="font-medium whitespace-nowrap px-2">Catatan IDUKA</th>
                </tr>
              </thead>
              <tbody>
                {jurnalPage.paginated.map((j) => (
                  <tr key={j.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-700 text-xs whitespace-nowrap px-2">{fmtDMY(j.date)}</td>
                    <td className="whitespace-nowrap px-2">
                      <p className="text-ink-900 font-medium"><TruncateText text={j.student?.user?.name} /></p>
                      <p className="text-xs text-ink-500">{j.student?.class_room?.name || '-'}</p>
                    </td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={j.placement?.dudi?.nama_perusahaan} /></td>
                    <td className="text-ink-700 px-2"><TruncateText text={j.kegiatan} maxWidth="18rem" /></td>
                    <td className="text-ink-500 px-2"><TruncateText text={j.catatan || '-'} maxWidth="14rem" /></td>
                  </tr>
                ))}
                {jurnal.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada jurnal kegiatan untuk filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={jurnalPage.page} totalPages={jurnalPage.totalPages} onChange={jurnalPage.setPage} />
        </div>
      ) : (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="font-display font-semibold text-ink-900">
              Nilai per Siswa <span className="text-ink-500 font-sans font-normal text-sm">({nilai.length} siswa)</span>
            </h2>
            {rataRataNilai !== null && <span className="badge-soft badge-brand">Rata-rata: {rataRataNilai}</span>}
          </div>
          <p className="text-xs text-ink-400 mb-4">{jumlahDinilai} dari {nilai.length} siswa sudah dinilai IDUKA.</p>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Siswa</th>
                  <th className="font-medium whitespace-nowrap px-2">IDUKA</th>
                  <th className="font-medium whitespace-nowrap px-2">Pembimbing</th>
                  <th className="font-medium text-center whitespace-nowrap px-2">Nilai Akhir</th>
                  <th className="font-medium whitespace-nowrap px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {nilaiPage.paginated.map((p) => (
                  <tr key={p.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2">
                      <p className="text-ink-900 font-medium"><TruncateText text={p.student?.user?.name} /></p>
                      <p className="text-xs text-ink-500">{p.student?.class_room?.name || '-'}</p>
                    </td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.dudi?.nama_perusahaan} /></td>
                    <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.guru_pembimbing?.user?.name || '-'} /></td>
                    <td className="text-center font-medium text-ink-900 whitespace-nowrap px-2">{p.nilai_akhir ?? '-'}</td>
                    <td className="whitespace-nowrap px-2">
                      <span className={`badge-soft ${p.penilaian ? 'badge-brand' : ''}`}>{p.penilaian ? 'Sudah dinilai' : 'Belum dinilai'}</span>
                    </td>
                  </tr>
                ))}
                {nilai.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada penempatan PKL untuk filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={nilaiPage.page} totalPages={nilaiPage.totalPages} onChange={nilaiPage.setPage} />
        </div>
      )}
    </div>
  );
}
