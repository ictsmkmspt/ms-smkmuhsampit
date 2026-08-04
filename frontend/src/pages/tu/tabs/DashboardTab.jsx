import { useEffect, useMemo, useState } from 'react';
import { Users, CheckCircle2, AlertCircle, Wallet, Search, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import api from '../../../api/axios';
import { BULAN, formatRupiah, StatTile, Avatar } from '../shared';
import StudentSppPanel from '../StudentSppPanel';

export default function DashboardTab() {
  const now = new Date();

  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [spps, setSpps] = useState([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [nominalDefault, setNominalDefault] = useState(0);
  const [loadingRingkasan, setLoadingRingkasan] = useState(true);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [tagihanLainList, setTagihanLainList] = useState([]);
  const [daftarNamaTagihan, setDaftarNamaTagihan] = useState([]);
  const [namaTagihanFilter, setNamaTagihanFilter] = useState(''); // '' = semua jenis
  const [loadingTagihanLain, setLoadingTagihanLain] = useState(true);

  useEffect(() => {
    api.get('/students').then((res) => setStudents(res.data));
  }, []);

  useEffect(() => {
    setLoadingRingkasan(true);
    Promise.all([
      api.get('/spp', { params: { bulan, tahun } }),
      api.get('/spp/settings'),
    ]).then(([spp, settings]) => {
      setSpps(spp.data.data);
      setTotalSiswa(spp.data.total_siswa);
      setNominalDefault(settings.data.nominal_default);
    }).finally(() => setLoadingRingkasan(false));
  }, [bulan, tahun]);

  useEffect(() => {
    setLoadingTagihanLain(true);
    const params = {};
    if (namaTagihanFilter) params.nama_tagihan = namaTagihanFilter;
    api.get('/tagihan-lain', { params })
      .then((res) => {
        setTagihanLainList(res.data.data);
        setDaftarNamaTagihan(res.data.daftar_nama_tagihan);
      })
      .finally(() => setLoadingTagihanLain(false));
  }, [namaTagihanFilter]);

  const gantiBulan = (delta) => {
    let b = bulan + delta;
    let t = tahun;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulan(b);
    setTahun(t);
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => s.user?.name?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, students]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearch('');
  };

  const sppLunas = spps.filter((s) => s.status === 'lunas');
  const sppBelum = spps.filter((s) => s.status !== 'lunas'); // termasuk "sebagian"
  const totalTerkumpul = spps.reduce((sum, s) => sum + Number(s.jumlah_dibayar || 0), 0);
  const totalTunggakan = sppBelum.reduce((sum, s) => sum + Number(s.nominal || 0) - Number(s.jumlah_dibayar || 0), 0);

  const tlLunas = tagihanLainList.filter((t) => t.status === 'lunas');
  const tlBelumLunas = tagihanLainList.filter((t) => t.status !== 'lunas');
  const tlTerkumpul = tagihanLainList.reduce((sum, t) => sum + Number(t.jumlah_dibayar || 0), 0);
  const tlTunggakan = tlBelumLunas.reduce((sum, t) => sum + Number(t.nominal || 0) - Number(t.jumlah_dibayar || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Dashboard SPP</h2>
        <p className="text-sm text-ink-500">Proses pembayaran SPP siswa dan pantau ringkasan tagihan di sini.</p>
      </div>

      {/* Cari & bayar SPP per siswa */}
      <div className="surface-card p-5">
        <h3 className="font-display font-semibold text-ink-900 mb-1">Cari & Bayar SPP Siswa</h3>
        <p className="text-xs text-ink-500 mb-3">Cari siswa yang mau bayar SPP, lihat tunggakannya, lalu tandai lunas langsung.</p>

        {!selectedStudent ? (
          <div className="relative">
            <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input pl-9" placeholder="Ketik nama atau NIS siswa..."
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full surface-card overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-mist-50 transition"
                  >
                    <Avatar name={s.user?.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-ink-900 truncate">{s.user?.name}</span>
                      <span className="block text-xs text-ink-400">{s.class_room?.name || '-'} · NIS {s.nis}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {search.trim() && searchResults.length === 0 && (
              <p className="text-xs text-ink-400 mt-2">Tidak ada siswa yang cocok dengan &quot;{search}&quot;.</p>
            )}
          </div>
        ) : (
          <StudentSppPanel student={selectedStudent} onClose={() => setSelectedStudent(null)} />
        )}
      </div>

      {/* Ringkasan bulanan */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold text-ink-900">Ringkasan Bulanan</h3>
          <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
            <button onClick={() => gantiBulan(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-ink-900 px-2 min-w-[9rem] text-center">{BULAN[bulan - 1]} {tahun}</span>
            <button onClick={() => gantiBulan(1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingRingkasan ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Users} tone="neutral" label="Siswa Ditagih" value={`${spps.length} / ${totalSiswa}`} sub={BULAN[bulan - 1]} />
              <StatTile icon={CheckCircle2} tone="brand" label="Sudah Lunas" value={sppLunas.length} sub={formatRupiah(totalTerkumpul) + ' terkumpul'} />
              <StatTile icon={AlertCircle} tone="rose" label="Belum Bayar" value={sppBelum.length} sub={formatRupiah(totalTunggakan) + ' tunggakan'} />
              <StatTile icon={Wallet} tone="neutral" label="Nominal Default" value={formatRupiah(nominalDefault)} sub="per siswa / bulan" />
            </div>

            {spps.length === 0 && (
              <div className="surface-card p-5 text-sm text-ink-500 mt-3">
                Tagihan SPP bulan {BULAN[bulan - 1]} {tahun} belum dibuat. Buka menu <span className="font-medium text-ink-700">Tagihan SPP</span> untuk membuatnya.
              </div>
            )}
          </>
        )}
      </div>

      {/* Ringkasan Tagihan Lain */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold text-ink-900">Ringkasan Tagihan Lain</h3>
          <select
            value={namaTagihanFilter}
            onChange={(e) => setNamaTagihanFilter(e.target.value)}
            className="field-input text-sm text-ink-700 w-60"
          >
            <option value="">Semua Jenis Tagihan</option>
            {daftarNamaTagihan.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {loadingTagihanLain ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Receipt} tone="neutral" label="Total Tagihan" value={tagihanLainList.length} sub={namaTagihanFilter || 'Semua jenis'} />
              <StatTile icon={CheckCircle2} tone="brand" label="Sudah Lunas" value={tlLunas.length} sub={formatRupiah(tlTerkumpul) + ' terkumpul'} />
              <StatTile icon={AlertCircle} tone="rose" label="Belum Lunas" value={tlBelumLunas.length} sub={formatRupiah(tlTunggakan) + ' tunggakan'} />
              <StatTile icon={Wallet} tone="neutral" label="Jenis Tagihan" value={daftarNamaTagihan.length} sub="jenis tercatat" />
            </div>

            {tagihanLainList.length === 0 && (
              <div className="surface-card p-5 text-sm text-ink-500 mt-3">
                {namaTagihanFilter
                  ? `Belum ada tagihan "${namaTagihanFilter}" tercatat.`
                  : <>Belum ada Tagihan Lain tercatat. Buka menu <span className="font-medium text-ink-700">Tagihan Lain</span> untuk membuatnya.</>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
