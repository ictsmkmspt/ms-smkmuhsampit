import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Wallet, Receipt, TrendingUp, Download, Search, AlertCircle } from 'lucide-react';
import api from '../../../../api/axios';
import { BULAN, formatRupiah, StatTile, Avatar } from '../../shared';
import TruncateText from '../../../../components/TruncateText';
import { fmtDMY } from '../../../../utils/date';

const PAGE_SIZE = 15;

function Pager({ page, totalPages, totalItems, onPrev, onNext }) {
  if (totalItems <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-200">
      <button onClick={onPrev} disabled={page === 1} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
        <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
      </button>
      <span className="text-xs text-ink-400">Halaman {page} / {totalPages}</span>
      <button onClick={onNext} disabled={page === totalPages} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
        Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function RingkasanSection() {
  const now = new Date();

  // === Laporan Keuangan Bulanan ===
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [keuangan, setKeuangan] = useState(null);
  const [loadingKeuangan, setLoadingKeuangan] = useState(true);
  const [exportingKeuangan, setExportingKeuangan] = useState(false);
  const [keuanganPage, setKeuanganPage] = useState(1);

  useEffect(() => {
    setLoadingKeuangan(true);
    setKeuangan(null);
    setKeuanganPage(1);
    api.get('/laporan/keuangan', { params: { bulan, tahun } })
      .then((res) => setKeuangan(res.data))
      .catch(() => setKeuangan(null))
      .finally(() => setLoadingKeuangan(false));
  }, [bulan, tahun]);

  const gantiBulan = (delta) => {
    let b = bulan + delta;
    let t = tahun;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulan(b);
    setTahun(t);
  };

  const exportKeuangan = async () => {
    setExportingKeuangan(true);
    try {
      const res = await api.get('/laporan/keuangan/export', { params: { bulan, tahun }, responseType: 'blob' });
      downloadBlob(res, `laporan-keuangan-${tahun}-${String(bulan).padStart(2, '0')}.xlsx`);
    } finally {
      setExportingKeuangan(false);
    }
  };

  const rincianGabungan = useMemo(() => {
    if (!keuangan) return [];
    return [
      ...keuangan.rincian_spp.map((s) => ({ ...s, _jenis: 'SPP', _label: `SPP ${BULAN[s.bulan - 1]} ${s.tahun}` })),
      ...keuangan.rincian_lain.map((t) => ({ ...t, _jenis: 'Lain', _label: t.nama_tagihan })),
    ].sort((a, b) => (a.tanggal_bayar < b.tanggal_bayar ? 1 : -1));
  }, [keuangan]);

  // === Laporan Tunggakan ===
  const [classes, setClasses] = useState([]);
  const [classRoomId, setClassRoomId] = useState('');
  const [searchTunggakan, setSearchTunggakan] = useState('');
  const [tunggakanList, setTunggakanList] = useState([]);
  const [loadingTunggakan, setLoadingTunggakan] = useState(true);
  const [exportingTunggakan, setExportingTunggakan] = useState(false);
  const [tunggakanPage, setTunggakanPage] = useState(1);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadTunggakan = () => {
    setLoadingTunggakan(true);
    setTunggakanPage(1);
    const params = {};
    if (classRoomId) params.class_room_id = classRoomId;
    if (searchTunggakan) params.search = searchTunggakan;
    api.get('/laporan/tunggakan', { params })
      .then((res) => setTunggakanList(res.data))
      .finally(() => setLoadingTunggakan(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya load sekali saat mount, perubahan filter dipicu manual lewat tombol Tampilkan
  useEffect(() => { loadTunggakan(); }, []);

  const exportTunggakan = async () => {
    setExportingTunggakan(true);
    try {
      const params = {};
      if (classRoomId) params.class_room_id = classRoomId;
      if (searchTunggakan) params.search = searchTunggakan;
      const res = await api.get('/laporan/tunggakan/export', { params, responseType: 'blob' });
      downloadBlob(res, 'laporan-tunggakan.xlsx');
    } finally {
      setExportingTunggakan(false);
    }
  };

  const totalTunggakanKeseluruhan = tunggakanList.reduce((sum, t) => sum + Number(t.total_tunggakan || 0), 0);

  const keuanganTotalPages = Math.max(1, Math.ceil(rincianGabungan.length / PAGE_SIZE));
  const paginatedRincian = rincianGabungan.slice((keuanganPage - 1) * PAGE_SIZE, keuanganPage * PAGE_SIZE);

  const tunggakanTotalPages = Math.max(1, Math.ceil(tunggakanList.length / PAGE_SIZE));
  const paginatedTunggakan = tunggakanList.slice((tunggakanPage - 1) * PAGE_SIZE, tunggakanPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Laporan Keuangan Bulanan */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ink-500" /> Laporan Keuangan Bulanan
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
              <button onClick={() => gantiBulan(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan sebelumnya">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-ink-900 px-2 min-w-[9rem] text-center">{BULAN[bulan - 1]} {tahun}</span>
              <button onClick={() => gantiBulan(1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan berikutnya">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={exportKeuangan}
              disabled={exportingKeuangan || loadingKeuangan}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 disabled:opacity-50 rounded-xl px-3 py-2 transition"
            >
              <Download className="w-4 h-4" /> {exportingKeuangan ? 'Mengunduh...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {loadingKeuangan ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : !keuangan ? (
          <p className="text-center text-honey-700 py-6">Gagal memuat laporan keuangan. Coba muat ulang halaman.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <StatTile icon={Wallet} tone="brand" label="Total SPP Terkumpul" value={formatRupiah(keuangan.total_spp)} sub={`${keuangan.jumlah_transaksi_spp} transaksi`} />
              <StatTile icon={Receipt} tone="brand" label="Total Tagihan Lain Terkumpul" value={formatRupiah(keuangan.total_lain)} sub={`${keuangan.jumlah_transaksi_lain} transaksi`} />
              <StatTile icon={TrendingUp} tone="neutral" label="Total Pemasukan" value={formatRupiah(keuangan.total_keseluruhan)} sub={BULAN[bulan - 1] + ' ' + tahun} />
            </div>

            {rincianGabungan.length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-6">Belum ada pemasukan tercatat di {BULAN[bulan - 1]} {tahun}.</p>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-line-200">
                      <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                      <th className="font-medium whitespace-nowrap px-2">Siswa</th>
                      <th className="font-medium whitespace-nowrap px-2">Jenis</th>
                      <th className="font-medium whitespace-nowrap px-2">Keterangan</th>
                      <th className="font-medium text-right whitespace-nowrap px-2">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRincian.map((r) => (
                      <tr key={`${r._jenis}-${r.id}`} className="border-t border-line-200">
                        <td className="py-2 text-ink-700 text-xs whitespace-nowrap px-2">{fmtDMY(r.tanggal_bayar)}</td>
                        <td className="text-ink-900 whitespace-nowrap px-2"><TruncateText text={r.student?.user?.name} maxWidth="10rem" /></td>
                        <td className="text-ink-700 whitespace-nowrap px-2">{r._jenis}</td>
                        <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={r._label} maxWidth="10rem" /></td>
                        <td className="text-right text-brand-700 font-medium whitespace-nowrap px-2">{formatRupiah(r.jumlah_dibayar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager
              page={keuanganPage} totalPages={keuanganTotalPages} totalItems={rincianGabungan.length}
              onPrev={() => setKeuanganPage((p) => Math.max(1, p - 1))}
              onNext={() => setKeuanganPage((p) => Math.min(keuanganTotalPages, p + 1))}
            />
          </>
        )}
      </div>

      {/* Laporan Tunggakan */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-display font-semibold text-ink-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-ink-500" /> Laporan Tunggakan
          </h3>
          <button
            onClick={exportTunggakan}
            disabled={exportingTunggakan || loadingTunggakan}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 disabled:opacity-50 rounded-xl px-3 py-2 transition"
          >
            <Download className="w-4 h-4" /> {exportingTunggakan ? 'Mengunduh...' : 'Export Excel'}
          </button>
        </div>

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
            <input type="text" value={searchTunggakan} onChange={(e) => setSearchTunggakan(e.target.value)} className="field-input" placeholder="Cari siswa..." />
          </div>
          <button onClick={loadTunggakan} className="btn-primary">
            <Search className="w-4 h-4" /> Tampilkan
          </button>
          <div className="ml-auto">
            <span className="badge-soft badge-rose">{tunggakanList.length} siswa · {formatRupiah(totalTunggakanKeseluruhan)}</span>
          </div>
        </div>

        {loadingTunggakan ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : tunggakanList.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-6">Tidak ada siswa dengan tunggakan untuk filter ini.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                  <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Tunggakan SPP</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Tunggakan Lain</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTunggakan.map((row) => (
                  <tr key={row.student.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.student.user?.name} />
                        <span className="text-ink-900 min-w-0"><TruncateText text={row.student.user?.name} /></span>
                      </div>
                    </td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{row.student.class_room?.name || '-'}</td>
                    <td className="text-right text-ink-700 whitespace-nowrap px-2">{formatRupiah(row.tunggakan_spp)}</td>
                    <td className="text-right text-ink-700 whitespace-nowrap px-2">{formatRupiah(row.tunggakan_lain)}</td>
                    <td className="text-right font-medium text-honey-700 whitespace-nowrap px-2">{formatRupiah(row.total_tunggakan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          page={tunggakanPage} totalPages={tunggakanTotalPages} totalItems={tunggakanList.length}
          onPrev={() => setTunggakanPage((p) => Math.max(1, p - 1))}
          onNext={() => setTunggakanPage((p) => Math.min(tunggakanTotalPages, p + 1))}
        />
      </div>
    </div>
  );
}
