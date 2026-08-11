import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Undo2, Wallet, CalendarDays } from 'lucide-react';
import api from '../../../../api/axios';
import { BULAN, formatRupiah, Avatar } from '../../shared';
import TruncateText from '../../../../components/TruncateText';

const PAGE_SIZE = 10;

function statusBadge(status) {
  if (status === 'lunas') return <span className="badge-soft badge-brand">Lunas</span>;
  if (status === 'sebagian') return <span className="badge-soft badge-honey">Sebagian</span>;
  return <span className="badge-soft badge-rose">Belum Bayar</span>;
}

/**
 * Laporan lengkap 1 siswa: seluruh riwayat SPP & Tagihan Lain (tanpa
 * batasan tahun ajaran, sama seperti StudentSppPanel), tapi ditampilkan
 * murni sebagai laporan (bukan panel bayar) dengan tabel terpisah SPP vs
 * Tagihan Lain, masing-masing dipaginasi karena riwayat 1 siswa bisa
 * bertahun-tahun. Daftar siswa awal bisa disaring per kelas dulu supaya
 * TU tidak perlu ketik nama satu-satu.
 */
export default function LaporanPeroranganSection() {
  const [classes, setClasses] = useState([]);
  const [classRoomId, setClassRoomId] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [spp, setSpp] = useState([]);
  const [tagihanLain, setTagihanLain] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sppPage, setSppPage] = useState(1);
  const [lainPage, setLainPage] = useState(1);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    setLoadingRoster(true);
    api.get('/students')
      .then((res) => {
        setStudents(res.data);
        setFilteredStudents(res.data);
      })
      .finally(() => setLoadingRoster(false));
  }, []);

  const loadRoster = () => {
    const q = searchSiswa.trim().toLowerCase();
    const hasil = students.filter((s) => {
      const cocokKelas = !classRoomId || String(s.class_room_id) === String(classRoomId);
      const cocokCari = !q || s.user?.name?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q);
      return cocokKelas && cocokCari;
    });
    setFilteredStudents(hasil);
  };

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setSppPage(1);
    setLainPage(1);
    setLoadingDetail(true);
    Promise.all([
      api.get(`/spp/siswa/${s.id}`).then((res) => setSpp(res.data.spp)),
      api.get(`/tagihan-lain/siswa/${s.id}`).then((res) => setTagihanLain(res.data.tagihan)),
    ]).finally(() => setLoadingDetail(false));
  };

  const backToList = () => {
    setSelectedStudent(null);
    setSpp([]);
    setTagihanLain([]);
  };

  const tunggakanSpp = spp.filter((s) => s.status !== 'lunas').reduce((sum, s) => sum + (s.nominal - (s.jumlah_dibayar || 0)), 0);
  const tunggakanLain = tagihanLain.filter((t) => t.status !== 'lunas').reduce((sum, t) => sum + (t.nominal - (t.jumlah_dibayar || 0)), 0);
  const totalTunggakan = tunggakanSpp + tunggakanLain;

  const sppTotalPages = Math.max(1, Math.ceil(spp.length / PAGE_SIZE));
  const sppPaginated = spp.slice((sppPage - 1) * PAGE_SIZE, sppPage * PAGE_SIZE);
  const lainTotalPages = Math.max(1, Math.ceil(tagihanLain.length / PAGE_SIZE));
  const lainPaginated = tagihanLain.slice((lainPage - 1) * PAGE_SIZE, lainPage * PAGE_SIZE);

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-line-200 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={selectedStudent.user?.name} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{selectedStudent.user?.name}</p>
                <p className="text-xs text-ink-500">{selectedStudent.class_room?.name || '-'} · NIS {selectedStudent.nis}</p>
              </div>
            </div>
            <button
              onClick={backToList}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar
            </button>
          </div>

          {loadingDetail ? (
            <p className="text-center text-ink-300 py-6 text-sm">Memuat riwayat tagihan...</p>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-500">Total Tunggakan (SPP + Tagihan Lain)</p>
              <p className="text-lg font-display font-semibold text-honey-700">{formatRupiah(totalTunggakan)}</p>
            </div>
          )}
        </div>

        {/* Riwayat SPP */}
        <div className="surface-card p-5">
          <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-ink-500" /> Riwayat SPP
          </h3>
          {loadingDetail ? (
            <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
          ) : spp.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">Belum ada tagihan SPP.</p>
          ) : (
            <>
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-line-200">
                      <th className="pb-2 font-medium whitespace-nowrap px-2">Bulan</th>
                      <th className="font-medium text-right whitespace-nowrap px-2">Nominal</th>
                      <th className="font-medium whitespace-nowrap px-2">Status</th>
                      <th className="font-medium whitespace-nowrap px-2">Tanggal Bayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sppPaginated.map((s) => (
                      <tr key={s.id} className="border-t border-line-200">
                        <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{BULAN[s.bulan - 1]} {s.tahun}</td>
                        <td className="text-right text-ink-700 whitespace-nowrap px-2">
                          {formatRupiah(s.nominal)}
                          {s.status === 'sebagian' && <span className="text-honey-700"> · dibayar {formatRupiah(s.jumlah_dibayar)}</span>}
                        </td>
                        <td className="whitespace-nowrap px-2">{statusBadge(s.status)}</td>
                        <td className="text-ink-500 text-xs whitespace-nowrap px-2">{s.tanggal_bayar || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {spp.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-200">
                  <button
                    onClick={() => setSppPage((p) => Math.max(1, p - 1))}
                    disabled={sppPage === 1}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </button>
                  <span className="text-xs text-ink-400">Halaman {sppPage} / {sppTotalPages}</span>
                  <button
                    onClick={() => setSppPage((p) => Math.min(sppTotalPages, p + 1))}
                    disabled={sppPage === sppTotalPages}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Riwayat Tagihan Lain */}
        <div className="surface-card p-5">
          <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-ink-500" /> Riwayat Tagihan Lain
          </h3>
          {loadingDetail ? (
            <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
          ) : tagihanLain.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">Belum ada tagihan lain.</p>
          ) : (
            <>
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-line-200">
                      <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Tagihan</th>
                      <th className="font-medium text-right whitespace-nowrap px-2">Nominal</th>
                      <th className="font-medium whitespace-nowrap px-2">Status</th>
                      <th className="font-medium whitespace-nowrap px-2">Tanggal Bayar</th>
                      <th className="font-medium whitespace-nowrap px-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lainPaginated.map((t) => (
                      <tr key={t.id} className="border-t border-line-200">
                        <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={t.nama_tagihan} maxWidth="12rem" /></td>
                        <td className="text-right text-ink-700 whitespace-nowrap px-2">
                          {formatRupiah(t.nominal)}
                          {t.status === 'sebagian' && <span className="text-honey-700"> · dibayar {formatRupiah(t.jumlah_dibayar)}</span>}
                        </td>
                        <td className="whitespace-nowrap px-2">{statusBadge(t.status)}</td>
                        <td className="text-ink-500 text-xs whitespace-nowrap px-2">{t.tanggal_bayar || '-'}</td>
                        <td className="text-ink-500 text-xs whitespace-nowrap px-2"><TruncateText text={t.keterangan || '-'} maxWidth="10rem" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tagihanLain.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-200">
                  <button
                    onClick={() => setLainPage((p) => Math.max(1, p - 1))}
                    disabled={lainPage === 1}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </button>
                  <span className="text-xs text-ink-400">Halaman {lainPage} / {lainTotalPages}</span>
                  <button
                    onClick={() => setLainPage((p) => Math.min(lainTotalPages, p + 1))}
                    disabled={lainPage === lainTotalPages}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Cari Nama/NIS</label>
          <input type="text" value={searchSiswa} onChange={(e) => setSearchSiswa(e.target.value)} className="field-input" placeholder="Cari siswa..." />
        </div>
        <button onClick={loadRoster} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <div className="ml-auto">
          <span className="badge-soft badge-brand">{filteredStudents.length} siswa</span>
        </div>
      </div>

      {loadingRoster ? (
        <p className="text-center text-ink-300 py-6">Memuat...</p>
      ) : filteredStudents.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-6">Tidak ada siswa untuk filter ini.</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                <th className="font-medium whitespace-nowrap px-2">NIS</th>
                <th className="font-medium whitespace-nowrap px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5 whitespace-nowrap px-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.user?.name} />
                      <span className="text-ink-900 min-w-0"><TruncateText text={s.user?.name} /></span>
                    </div>
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{s.class_room?.name || '-'}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{s.nis}</td>
                  <td className="text-right whitespace-nowrap px-2">
                    <button
                      onClick={() => selectStudent(s)}
                      className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition"
                    >
                      Lihat Laporan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
