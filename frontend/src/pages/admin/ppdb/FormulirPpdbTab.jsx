import { useEffect, useMemo, useState } from 'react';
import { Trash2, UserCheck, X, Plus, Check, Pencil, Wallet, BellRing, ShieldCheck } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import TambahPendaftarPpdbTab from './TambahPendaftarPpdbTab';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Verifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_BADGE = { mendaftar: 'badge-soft', verifikasi: 'badge-honey', diterima: 'badge-brand', ditolak: 'badge-soft' };

const emptyJadikanForm = { nis: '', email: '', class_room_id: '', jurusan_id: '' };
const emptyBayarForm = { nominal: '', metode: 'tunai', tanggal_bayar: '', catatan: '' };

const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

// Urutan & singkatan berkas untuk kolom "Kelengkapan Berkas" — cocok
// dengan 9 field berkas_*_url yang selalu disertakan backend (lihat
// PpdbPendaftar::$appends), centang hijau kalau ada, titik abu-abu kalau
// belum diunggah. Hover buat lihat nama lengkapnya.
const BERKAS_SINGKATAN = [
  { key: 'berkas_pas_foto_url', label: 'Pas Foto' },
  { key: 'berkas_ijazah_url', label: 'Ijazah SMP' },
  { key: 'berkas_skhu_url', label: 'SKHU' },
  { key: 'berkas_rapot_url', label: 'Nilai Rapor Kelas IX' },
  { key: 'berkas_skkb_url', label: 'Surat Keterangan Berkelakuan Baik' },
  { key: 'berkas_pernyataan_url', label: 'Fakta Integritas' },
  { key: 'berkas_akta_lahir_url', label: 'Akta Kelahiran' },
  { key: 'berkas_kk_url', label: 'Kartu Keluarga' },
  { key: 'berkas_kip_url', label: 'Kartu Indonesia Pintar' },
];

export default function FormulirPpdbTab() {
  const [pendaftar, setPendaftar] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [namaFilter, setNamaFilter] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState('');
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [showTambah, setShowTambah] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const pendaftarTersaring = useMemo(() => pendaftar.filter((p) => {
    const cocokNama = !namaFilter || (p.nama_lengkap || '').toLowerCase().includes(namaFilter.trim().toLowerCase());
    const cocokJurusan = !jurusanFilter || (p.jurusan_pilihan || '').trim().toLowerCase() === jurusanFilter.trim().toLowerCase();
    return cocokNama && cocokJurusan;
  }), [pendaftar, namaFilter, jurusanFilter]);

  const { page, setPage, totalPages, paginated: pendaftarHalaman } = usePagination(pendaftarTersaring, 40);

  const load = (status, periodeId) => api.get('/ppdb', { params: { status: status || undefined, ppdb_periode_id: periodeId || undefined } }).then((res) => setPendaftar(res.data));
  useEffect(() => { load(statusFilter, periodeFilter); }, [statusFilter, periodeFilter]);

  const [classList, setClassList] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [periodeList, setPeriodeList] = useState([]);
  useEffect(() => {
    api.get('/classes', { params: { status: 'aktif' } }).then((res) => setClassList(res.data));
    api.get('/jurusan').then((res) => setJurusanList(res.data));
    api.get('/ppdb-periode').then((res) => {
      setPeriodeList(res.data);
      const aktif = res.data.find((pr) => pr.status === 'aktif');
      if (aktif) setPeriodeFilter(String(aktif.id));
    });
  }, []);

  // Status Lunas/Dicicil/Belum Bayar dihitung dari total cicilan vs
  // target_biaya (accessor backend — nominal periode PPDB pendaftar ini,
  // sudah dibedakan laki-laki/perempuan, lihat PpdbPendaftar::
  // getTargetBiayaAttribute()). Kalau targetnya 0 (belum diatur di
  // periode), status tidak ditampilkan (tidak masuk akal bandingkan ke 0).
  const statusBayar = (p) => {
    const dibayar = Number(p.total_dibayar || 0);
    const target = Number(p.target_biaya || 0);
    if (target <= 0) return null;
    if (dibayar <= 0) return { label: 'Belum Bayar', badge: 'badge-soft' };
    if (dibayar < target) return { label: 'Dicicil', badge: 'badge-honey' };
    return { label: 'Lunas', badge: 'badge-brand' };
  };

  const targetBayar = (p) => Number(p.target_biaya || 0);

  const [pembayaranTarget, setPembayaranTarget] = useState(null);
  const [pembayaranList, setPembayaranList] = useState([]);
  const [pembayaranLoading, setPembayaranLoading] = useState(false);
  const [bayarForm, setBayarForm] = useState(emptyBayarForm);
  const [bayarSaving, setBayarSaving] = useState(false);
  const [bayarError, setBayarError] = useState('');

  const openPembayaran = (p) => {
    setPembayaranTarget(p);
    setBayarForm(emptyBayarForm);
    setBayarError('');
    setPembayaranLoading(true);
    api.get(`/ppdb/${p.id}/pembayaran`).then((res) => setPembayaranList(res.data)).finally(() => setPembayaranLoading(false));
  };

  const handleTambahBayar = async (e) => {
    e.preventDefault();
    setBayarError('');
    setBayarSaving(true);
    try {
      const payload = { ...bayarForm };
      if (!payload.tanggal_bayar) delete payload.tanggal_bayar;
      if (!payload.catatan) delete payload.catatan;
      const res = await api.post(`/ppdb/${pembayaranTarget.id}/pembayaran`, payload);
      setPembayaranTarget(res.data);
      setBayarForm(emptyBayarForm);
      const list = await api.get(`/ppdb/${pembayaranTarget.id}/pembayaran`);
      setPembayaranList(list.data);
      load(statusFilter, periodeFilter);
      loadBuktiMasuk();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setBayarError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan pembayaran.');
    } finally {
      setBayarSaving(false);
    }
  };

  const handleHapusBayar = async (id) => {
    if (!confirm('Hapus catatan pembayaran ini?')) return;
    const res = await api.delete(`/ppdb/pembayaran/${id}`);
    setPembayaranTarget(res.data);
    setPembayaranList((prev) => prev.filter((x) => x.id !== id));
    load(statusFilter, periodeFilter);
    loadBuktiMasuk();
  };

  // Sisa tagihan pendaftar yang lagi dibuka modalnya — dipakai batasi
  // input nominal (biar tidak bisa lebih dari biaya daftar sekolah) &
  // tombol "Tandai Lunas" (langsung catat pembayaran sebesar sisanya).
  const sisaBayar = (p) => {
    const target = targetBayar(p);
    if (target <= 0) return null;
    return Math.max(0, target - Number(p.total_dibayar || 0));
  };

  // Notifikasi "Bukti Pembayaran Masuk" — pendaftar berstatus Diterima yang
  // sudah unggah bukti transfer (lewat halaman Cek Status publik) tapi
  // tagihannya di sistem masih ada sisa, artinya admin BELUM mencocokkan
  // buktinya ke catatan pembayaran. Begitu diverifikasi (atau dicatat lunas
  // manual), sisaBayar jadi 0 dan otomatis hilang dari daftar ini — tidak
  // perlu status terpisah buat "sudah diproses". SENGAJA di-fetch terpisah
  // dari tabel utama (bukan diturunkan dari `pendaftar`) supaya tidak ikut
  // hilang kalau admin sedang memfilter tabel ke status/periode lain —
  // notifikasi ini harus selalu kelihatan apa pun filter tabel yang aktif.
  const [buktiMasuk, setBuktiMasuk] = useState([]);
  const loadBuktiMasuk = () => api.get('/ppdb', { params: { status: 'diterima' } }).then((res) => {
    setBuktiMasuk(res.data.filter((p) => p.bukti_pembayaran_url && (sisaBayar(p) || 0) > 0));
  });
  useEffect(() => { loadBuktiMasuk(); }, []);

  const [verifyingId, setVerifyingId] = useState(null);

  const handleVerifikasiLunas = async (p) => {
    const sisa = sisaBayar(p);
    if (!sisa) return;
    const yakin = confirm(
      `Konfirmasi Verifikasi Pembayaran\n\n` +
      `Pastikan Anda sudah membuka & mencocokkan bukti transfer "${p.nama_lengkap}" (${p.kode_pendaftaran}) dengan mutasi rekening sekolah SEBELUM melanjutkan.\n\n` +
      `Tindakan ini akan mencatat pelunasan sebesar ${rupiah(sisa)} dan tidak bisa dibatalkan otomatis. Lanjutkan?`
    );
    if (!yakin) return;
    setVerifyingId(p.id);
    try {
      await api.post(`/ppdb/${p.id}/pembayaran`, {
        nominal: sisa, metode: 'transfer', catatan: 'Verifikasi bukti pembayaran',
      });
      load(statusFilter, periodeFilter);
      loadBuktiMasuk();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi pembayaran.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTandaiLunas = async () => {
    const sisa = sisaBayar(pembayaranTarget);
    if (!sisa || !confirm(`Catat pelunasan sebesar ${rupiah(sisa)}?`)) return;
    setBayarError('');
    setBayarSaving(true);
    try {
      const res = await api.post(`/ppdb/${pembayaranTarget.id}/pembayaran`, {
        nominal: sisa, metode: bayarForm.metode, catatan: 'Pelunasan',
      });
      setPembayaranTarget(res.data);
      const list = await api.get(`/ppdb/${pembayaranTarget.id}/pembayaran`);
      setPembayaranList(list.data);
      load(statusFilter, periodeFilter);
      loadBuktiMasuk();
    } catch (err) {
      setBayarError(err.response?.data?.message || 'Gagal mencatat pelunasan.');
    } finally {
      setBayarSaving(false);
    }
  };

  const handleHapusLunas = async () => {
    if (!confirm(`Hapus SEMUA catatan pembayaran untuk "${pembayaranTarget.nama_lengkap}" dan kembalikan ke Belum Bayar?`)) return;
    const res = await api.delete(`/ppdb/${pembayaranTarget.id}/pembayaran`);
    setPembayaranTarget(res.data);
    setPembayaranList([]);
    load(statusFilter, periodeFilter);
    loadBuktiMasuk();
  };

  const [jadikanTarget, setJadikanTarget] = useState(null);
  const [jadikanForm, setJadikanForm] = useState(emptyJadikanForm);
  const [jadikanSaving, setJadikanSaving] = useState(false);
  const [jadikanError, setJadikanError] = useState('');

  const openJadikanSiswa = (p) => {
    setJadikanError('');
    // Cocokkan jurusan_pilihan (teks bebas dari formulir) ke daftar jurusan
    // resmi kalau ada yang namanya persis sama — admin tetap bisa ganti.
    const cocok = jurusanList.find((j) => j.nama.toLowerCase() === (p.jurusan_pilihan || '').trim().toLowerCase());
    setJadikanForm({ ...emptyJadikanForm, jurusan_id: cocok?.id || '' });
    setJadikanTarget(p);
  };

  const handleJadikanSiswa = async (e) => {
    e.preventDefault();
    setJadikanError('');
    setJadikanSaving(true);
    try {
      await api.post(`/ppdb/${jadikanTarget.id}/jadikan-siswa`, jadikanForm);
      setJadikanTarget(null);
      load(statusFilter, periodeFilter);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setJadikanError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menjadikan siswa.');
    } finally {
      setJadikanSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus data pendaftar "${p.nama_lengkap}"?`)) return;
    try {
      await api.delete(`/ppdb/${p.id}`);
      load(statusFilter, periodeFilter);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data pendaftar.');
    }
  };

  if (showTambah || editTarget) {
    return (
      <TambahPendaftarPpdbTab
        editTarget={editTarget}
        onSaved={() => load(statusFilter, periodeFilter)}
        onBack={() => { setShowTambah(false); setEditTarget(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-700">
          Pendaftaran PPDB dilakukan calon siswa lewat formulir publik (<code className="font-mono">/ppdb</code>, tanpa akun login), atau diinput manual di sini kalau calon siswa daftar langsung ke sekolah (offline) — keduanya masuk ke daftar yang sama di bawah.
        </p>
        <button onClick={() => setShowTambah(true)} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Tambah Pendaftar Offline
        </button>
      </div>

      {buktiMasuk.length > 0 && (
        <div className="surface-card p-5 border-l-4 border-l-honey-400">
          <h2 className="font-display font-semibold text-ink-900 mb-1 flex items-center gap-2">
            <BellRing className="w-4.5 h-4.5 text-honey-600" /> Bukti Pembayaran Masuk
            <span className="text-ink-500 font-sans font-normal text-sm">({buktiMasuk.length})</span>
          </h2>
          <p className="text-xs text-ink-500 mb-4">Calon siswa yang sudah unggah bukti transfer lewat halaman Cek Status, tapi belum dicocokkan/dicatat sebagai pembayaran. Cek buktinya dulu sebelum verifikasi.</p>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
                  <th className="font-medium whitespace-nowrap px-2">Kode</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Sisa Tagihan</th>
                  <th className="font-medium whitespace-nowrap px-2">Bukti</th>
                  <th className="whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {buktiMasuk.map((p) => (
                  <tr key={p.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                    <td className="font-mono text-xs text-ink-500 whitespace-nowrap px-2">{p.kode_pendaftaran}</td>
                    <td className="text-right font-medium text-ink-900 whitespace-nowrap px-2">{rupiah(sisaBayar(p))}</td>
                    <td className="whitespace-nowrap px-2">
                      <a href={p.bukti_pembayaran_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">Lihat Bukti</a>
                    </td>
                    <td className="whitespace-nowrap px-2 text-right">
                      <button
                        onClick={() => handleVerifikasiLunas(p)}
                        disabled={verifyingId === p.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap ml-auto disabled:opacity-60"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> {verifyingId === p.id ? 'Memverifikasi...' : 'Verifikasi Lunas'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="surface-card p-5 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-ink-700">Periode PPDB</label>
        <select value={periodeFilter} onChange={(e) => setPeriodeFilter(e.target.value)} className="field-input text-ink-700 w-56">
          <option value="">Semua Periode</option>
          {periodeList.map((pr) => <option key={pr.id} value={pr.id}>{pr.nama}{pr.status === 'aktif' ? ' (Aktif)' : ''}</option>)}
        </select>
        <label className="text-sm font-medium text-ink-700">Filter Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-input text-ink-700 w-48">
          <option value="">Semua</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="text-sm font-medium text-ink-700">Nama</label>
        <input
          type="text" value={namaFilter} onChange={(e) => setNamaFilter(e.target.value)}
          placeholder="Cari nama..." className="field-input w-48"
        />
        <label className="text-sm font-medium text-ink-700">Jurusan</label>
        <select value={jurusanFilter} onChange={(e) => setJurusanFilter(e.target.value)} className="field-input text-ink-700 w-48">
          <option value="">Semua</option>
          {jurusanList.map((j) => <option key={j.id} value={j.nama}>{j.nama}</option>)}
        </select>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Calon Siswa <span className="text-ink-500 font-sans font-normal text-sm">({pendaftarTersaring.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
              <th className="font-medium whitespace-nowrap px-2">Kelengkapan Biodata</th>
              <th className="font-medium whitespace-nowrap px-2">Kelengkapan Berkas</th>
              <th className="font-medium whitespace-nowrap px-2">Pembayaran</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {pendaftarHalaman.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={p.jurusan_pilihan || '—'} /></td>
                <td className="whitespace-nowrap px-2">
                  <span className={`badge-soft ${p.biodata_lengkap ? 'badge-brand' : 'badge-honey'}`}>
                    {p.biodata_lengkap ? 'Lengkap' : 'Tidak Lengkap'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2">
                  <div className="flex items-center gap-0.5">
                    {BERKAS_SINGKATAN.map((b) => (
                      p[b.key] ? (
                        <a
                          key={b.key}
                          href={p[b.key]} target="_blank" rel="noreferrer"
                          title={`Lihat ${b.label}`}
                          className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 bg-brand-100 text-brand-600 hover:bg-brand-200"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span
                          key={b.key}
                          title={b.label}
                          className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 bg-mist-100 text-ink-300"
                        >
                          <span className="w-1 h-1 rounded-full bg-current" />
                        </span>
                      )
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-2">
                  <button onClick={() => openPembayaran(p)} className="flex items-center gap-1.5 hover:opacity-80">
                    <Wallet className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                    <span className="text-xs text-ink-700">{rupiah(p.total_dibayar)}</span>
                    {statusBayar(p) && <span className={`badge-soft ${statusBayar(p).badge}`}>{statusBayar(p).label}</span>}
                  </button>
                </td>
                <td className="text-center whitespace-nowrap px-2">
                  <span className={`badge-soft ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </td>
                <td className="text-right whitespace-nowrap px-2">
                  <div className="flex items-center justify-end gap-2">
                    {p.status === 'diterima' && (
                      p.student_id ? (
                        <span className="text-xs text-brand-700 font-medium">Sudah jadi siswa</span>
                      ) : (
                        <button onClick={() => openJadikanSiswa(p)} className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                          <UserCheck className="w-3.5 h-3.5" /> Jadikan Siswa
                        </button>
                      )
                    )}
                    <button onClick={() => setEditTarget(p)} className="text-ink-300 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {pendaftarTersaring.length === 0 && <tr><td colSpan="8" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">{pendaftar.length === 0 ? 'Belum ada pendaftar PPDB.' : 'Tidak ada pendaftar yang cocok dengan filter.'}</td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {jadikanTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleJadikanSiswa} className="surface-card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-ink-900">Jadikan Siswa Aktif</h2>
              <button type="button" onClick={() => setJadikanTarget(null)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-ink-500 mb-4">
              {jadikanTarget.nama_lengkap} — biodata dari formulir PPDB otomatis disalin ke Master Data &gt; Siswa. Lengkapi NIS &amp; kelas untuk melanjutkan.
            </p>
            {jadikanError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{jadikanError}</p>}
            <div className="space-y-3">
              <input placeholder="NIS" value={jadikanForm.nis} onChange={(e) => setJadikanForm({ ...jadikanForm, nis: e.target.value })} className="field-input w-full" required autoFocus />
              <input type="email" placeholder="Email (opsional)" value={jadikanForm.email} onChange={(e) => setJadikanForm({ ...jadikanForm, email: e.target.value })} className="field-input w-full" />
              <select value={jadikanForm.class_room_id} onChange={(e) => setJadikanForm({ ...jadikanForm, class_room_id: e.target.value })} className="field-input w-full text-ink-700" required>
                <option value="">— Pilih Kelas —</option>
                {classList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={jadikanForm.jurusan_id} onChange={(e) => setJadikanForm({ ...jadikanForm, jurusan_id: e.target.value })} className="field-input w-full text-ink-700">
                <option value="">Jurusan (opsional)</option>
                {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </div>
            <p className="text-xs text-ink-400 mt-3">Password akun otomatis dibuat default (123456).</p>
            <div className="flex gap-2 mt-4">
              <button disabled={jadikanSaving} className="btn-primary">{jadikanSaving ? 'Menyimpan...' : 'Jadikan Siswa'}</button>
              <button type="button" onClick={() => setJadikanTarget(null)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </form>
        </div>
      )}

      {pembayaranTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="surface-card p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-ink-900">Pembayaran Biaya Pendaftaran</h2>
              <button type="button" onClick={() => setPembayaranTarget(null)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-ink-500 mb-4">
              {pembayaranTarget.nama_lengkap} — {pembayaranTarget.kode_pendaftaran}
              {pembayaranTarget.bukti_pembayaran_url && (
                <a href={pembayaranTarget.bukti_pembayaran_url} target="_blank" rel="noreferrer" className="ml-2 font-medium text-brand-600 hover:underline">Lihat Bukti Pembayaran</a>
              )}
            </p>

            <div className="flex items-center justify-between gap-3 bg-mist-50 border border-line-200 rounded-lg px-3 py-2.5 mb-4 flex-wrap">
              <div>
                <p className="text-[11px] text-ink-500">Total Dibayar</p>
                <p className="text-sm font-semibold text-ink-900">{rupiah(pembayaranTarget.total_dibayar)}{targetBayar(pembayaranTarget) > 0 && <span className="text-ink-400 font-normal"> / {rupiah(targetBayar(pembayaranTarget))}</span>}</p>
                {sisaBayar(pembayaranTarget) > 0 && <p className="text-[11px] text-honey-700 mt-0.5">Sisa: {rupiah(sisaBayar(pembayaranTarget))}</p>}
              </div>
              <div className="flex items-center gap-2">
                {statusBayar(pembayaranTarget) && <span className={`badge-soft ${statusBayar(pembayaranTarget).badge}`}>{statusBayar(pembayaranTarget).label}</span>}
                {sisaBayar(pembayaranTarget) > 0 && (
                  <button type="button" onClick={handleTandaiLunas} disabled={bayarSaving} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                    Tandai Lunas
                  </button>
                )}
                {statusBayar(pembayaranTarget)?.label === 'Lunas' && (
                  <button type="button" onClick={handleHapusLunas} className="text-xs font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                    Hapus Lunas
                  </button>
                )}
              </div>
            </div>

            {bayarError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{bayarError}</p>}

            <form onSubmit={handleTambahBayar} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 mb-4">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number" min="1" max={sisaBayar(pembayaranTarget) || undefined} placeholder="Nominal (Rp)" value={bayarForm.nominal}
                  onChange={(e) => setBayarForm({ ...bayarForm, nominal: e.target.value })}
                  className="field-input w-full" required
                />
                <select value={bayarForm.metode} onChange={(e) => setBayarForm({ ...bayarForm, metode: e.target.value })} className="field-input w-full text-ink-700">
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                </select>
                <input
                  type="date" value={bayarForm.tanggal_bayar}
                  onChange={(e) => setBayarForm({ ...bayarForm, tanggal_bayar: e.target.value })}
                  className="field-input w-full"
                />
                <input
                  type="text" placeholder="Catatan (opsional)" value={bayarForm.catatan}
                  onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })}
                  className="field-input w-full"
                />
              </div>
              <button disabled={bayarSaving} className="btn-primary whitespace-nowrap">{bayarSaving ? 'Menyimpan...' : 'Catat Bayar'}</button>
            </form>

            <p className="text-xs font-medium text-ink-700 mb-2">Riwayat Cicilan</p>
            {pembayaranLoading ? (
              <p className="text-sm text-ink-300">Memuat...</p>
            ) : pembayaranList.length === 0 ? (
              <p className="text-sm text-ink-300">Belum ada pembayaran tercatat.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pembayaranList.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 border border-line-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{rupiah(b.nominal)} <span className="text-xs font-normal text-ink-500">({b.metode === 'tunai' ? 'Tunai' : 'Transfer'})</span></p>
                      <p className="text-[11px] text-ink-400">
                        {b.tanggal_bayar} {b.dicatat_oleh && `· dicatat ${b.dicatat_oleh.name}`} {b.catatan && `· ${b.catatan}`}
                      </p>
                    </div>
                    <button onClick={() => handleHapusBayar(b.id)} className="text-ink-300 hover:text-honey-700 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
