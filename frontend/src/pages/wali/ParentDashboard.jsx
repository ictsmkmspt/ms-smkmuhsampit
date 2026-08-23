import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, School, Trophy, AlertOctagon, Clock, ChevronDown, ChevronLeft, ChevronRight, Wallet, UserCog, Home, BookOpen, BookMarked, ScrollText, CalendarRange, ClipboardList, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import LeaderboardPrestasi from '../../components/LeaderboardPrestasi';
import EditProfileModal from '../../components/EditProfileModal';
import NotificationBell from '../../components/NotificationBell';
import KalenderAkademikView from '../../components/KalenderAkademikView';
import JadwalPelajaranView from '../../components/JadwalPelajaranView';
import PenilaianQuranTabs from '../../components/PenilaianQuranTabs';
import AnnouncementBoard from '../../components/AnnouncementBoard';
import { fmtDMY } from '../../utils/date';

// Navigasi utama sekarang navbar bawah (gaya sama dengan dashboard Guru) —
// cuma 2 tab pokok: Beranda & Nilai. Kalender Akademik dan Jadwal Pelajaran
// jadi sub-menu (pill) DI DALAM tab Beranda, sejajar dengan "Beranda"
// (ringkasan tagihan + aktivitas) sendiri.
const BOTTOM_TABS = [
  { key: 'beranda', label: 'Beranda', icon: Home },
  { key: 'nilai', label: 'Penilaian', icon: ClipboardList },
  { key: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
];

const BERANDA_SUB_TABS = [
  { key: 'ringkasan', label: 'Beranda', labelShort: 'Beranda', icon: Home },
  { key: 'kalender', label: 'Kalender Akademik', labelShort: 'Kalender', icon: CalendarRange },
  { key: 'jadwal', label: 'Jadwal Pelajaran', labelShort: 'Jadwal', icon: BookOpen },
];

const PAGE_SIZE = 5;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

const TYPE_CONFIG = {
  absensi: { icon: Clock, badge: 'badge-brand' },
  pelanggaran: { icon: AlertOctagon, badge: 'badge-rose' },
  prestasi: { icon: Trophy, badge: 'badge-honey' },
  nilai: { icon: ClipboardList, badge: 'badge-brand' },
  tahsin: { icon: BookOpen, badge: 'badge-brand' },
  tahfidz: { icon: BookMarked, badge: 'badge-brand' },
  tadarus: { icon: ScrollText, badge: 'badge-brand' },
};

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [spp, setSpp] = useState([]);
  const [tagihanLain, setTagihanLain] = useState([]);
  const [showTagihanDetail, setShowTagihanDetail] = useState(false);
  const [sppDetailPage, setSppDetailPage] = useState(1);
  const [lainDetailPage, setLainDetailPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [activeTab, setActiveTab] = useState('beranda');
  const [berandaSub, setBerandaSub] = useState('ringkasan');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get('/my-children')
      .then((res) => {
        setChildren(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
        else setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data anak.'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setActivityPage(1);
    setShowTagihanDetail(false);
    setSppDetailPage(1);
    setLainDetailPage(1);
    api.get(`/my-children/${selectedId}/activity`)
      .then((res) => setActivity(res.data))
      .catch(() => setError('Gagal memuat aktivitas.'))
      .finally(() => setLoading(false));

    api.get(`/my-children/${selectedId}/spp`)
      .then((res) => setSpp(res.data))
      .catch(() => setSpp([]));

    api.get(`/my-children/${selectedId}/tagihan-lain`)
      .then((res) => setTagihanLain(res.data))
      .catch(() => setTagihanLain([]));
  }, [selectedId]);

  // Endpoint sub-menu Penilaian (Nilai Akademik/Tahsin/Tahfidz/Tadarus) ikut
  // berganti begitu anak yang dipilih berganti — PenilaianQuranTabs mengambil
  // ulang datanya sendiri tiap prop ini berubah.
  const penilaianEndpoints = useMemo(() => ({
    akademik: `/my-children/${selectedId}/academic-scores`,
    tahsin: `/my-children/${selectedId}/tahsin-scores`,
    tahfidz: `/my-children/${selectedId}/tahfidz-scores`,
    tadarus: `/my-children/${selectedId}/tadarus-scores`,
  }), [selectedId]);

  const selectedChild = children.find((c) => c.id === selectedId);

  const timelineTotalPages = Math.max(1, Math.ceil((activity?.timeline?.length || 0) / PAGE_SIZE));
  const timelinePaginated = (activity?.timeline || []).slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE);

  const sppBelumLunas = spp.filter((s) => s.status !== 'lunas');
  const sppTunggakan = sppBelumLunas.reduce((sum, s) => sum + Number(s.nominal || 0) - Number(s.jumlah_dibayar || 0), 0);

  const tagihanLainBelumLunas = tagihanLain.filter((t) => t.status !== 'lunas');
  const tagihanLainTunggakan = tagihanLainBelumLunas.reduce((sum, t) => sum + Number(t.nominal || 0) - Number(t.jumlah_dibayar || 0), 0);

  const belumLunasCount = sppBelumLunas.length + tagihanLainBelumLunas.length;

  const statusBadge = (status) => {
    if (status === 'lunas') return <span className="badge-soft badge-brand">Lunas</span>;
    if (status === 'sebagian') return <span className="badge-soft badge-honey">Sebagian</span>;
    return <span className="badge-soft badge-rose">Belum Bayar</span>;
  };

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-white/60">Orang Tua / Wali</p>
            <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
          </div>
          <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold text-white hover:text-[#F2B705] transition"
            >
              Profil
              <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 surface-card overflow-hidden">
                <button
                  onClick={() => { setShowEditProfil(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <UserCog className="w-4 h-4" /> Edit Profil
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-3 pb-10">
        {children.length === 0 && !loading && (
          <div className="surface-card p-6 text-center">
            <School className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada data anak yang terhubung ke akun ini. Hubungi admin sekolah untuk menghubungkan akun.</p>
          </div>
        )}

        {children.length > 0 && (
          <>
            {/* Pemilih anak, cuma tampil kalau lebih dari 1 anak — berlaku
                buat tab Beranda maupun Nilai, bukan cuma salah satu. */}
            {children.length > 1 && (
              <div className="relative mb-5 w-72 mx-auto">
                <button
                  onClick={() => setShowPicker((p) => !p)}
                  className="w-full flex items-center justify-between gap-2 field-input bg-white text-ink-900 font-medium"
                >
                  <span>{selectedChild?.user?.name}</span>
                  <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                </button>
                {showPicker && (
                  <div className="absolute z-10 mt-1 w-full surface-card overflow-hidden">
                    {children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedId(c.id); setShowPicker(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition ${
                          selectedId === c.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-mist-50'
                        }`}
                      >
                        <span>{c.user?.name}</span>
                        <span className="text-xs text-ink-400">{c.class_room?.name || '-'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'beranda' && (
              <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto">
                {BERANDA_SUB_TABS.map((t) => {
                  const isActive = berandaSub === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setBerandaSub(t.key)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                        isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="sm:hidden">{t.labelShort}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'beranda' && berandaSub === 'kalender' && <KalenderAkademikView />}

            {activeTab === 'beranda' && berandaSub === 'jadwal' && (
              <div className="surface-card p-4">
                <h2 className="font-display font-semibold text-ink-900 mb-3">
                  Jadwal Pelajaran <span className="text-ink-500 font-sans font-normal text-sm">— {selectedChild?.user?.name}</span>
                </h2>
                <JadwalPelajaranView endpoint={`/my-children/${selectedId}/schedule`} />
              </div>
            )}

            {activeTab === 'pengumuman' && <AnnouncementBoard />}

            {activeTab === 'nilai' && (
              <PenilaianQuranTabs
                endpoints={penilaianEndpoints}
                title={<>Penilaian <span className="text-ink-500 font-sans font-normal text-sm">— {selectedChild?.user?.name}</span></>}
              />
            )}
          </>
        )}

        {activeTab === 'beranda' && berandaSub === 'ringkasan' && children.length > 0 && showTagihanDetail && (
          <div className="space-y-6">
            {/* Halaman penuh (bukan popup) — sama seperti Laporan Perorangan di
                dashboard TU, cuma untuk 1 anak yang sedang dipilih. */}
            <div className="surface-card p-5">
              <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-ink-900 text-lg">Detail Tagihan</h2>
                  <p className="text-sm text-ink-500 truncate">
                    {selectedChild?.user?.name} · {selectedChild?.class_room?.name || '-'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTagihanDetail(false)}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-500">Total Tunggakan (SPP + Tagihan Lain)</p>
                <p className="text-lg font-display font-semibold text-honey-700">{formatRupiah(sppTunggakan + tagihanLainTunggakan)}</p>
              </div>
            </div>

            <div className="surface-card p-5">
              <h3 className="font-display font-semibold text-ink-900 mb-3">Riwayat SPP</h3>
              <PaginatedTagihanList
                items={spp}
                page={sppDetailPage}
                setPage={setSppDetailPage}
                emptyText="Belum ada tagihan SPP tercatat."
                renderItem={(s) => (
                  <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{BULAN[s.bulan - 1]} {s.tahun}</p>
                      <p className="text-xs text-ink-500">
                        {formatRupiah(s.nominal)}
                        {s.status === 'sebagian' && (
                          <span className="text-honey-700"> · sisa {formatRupiah(s.nominal - s.jumlah_dibayar)}</span>
                        )}
                      </p>
                    </div>
                    {statusBadge(s.status)}
                  </li>
                )}
              />
            </div>

            <div className="surface-card p-5">
              <h3 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-ink-500" /> Riwayat Tagihan Lain
              </h3>
              <PaginatedTagihanList
                items={tagihanLain}
                page={lainDetailPage}
                setPage={setLainDetailPage}
                emptyText="Belum ada tagihan lain tercatat."
                renderItem={(t) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{t.nama_tagihan}</p>
                      <p className="text-xs text-ink-500">
                        {formatRupiah(t.nominal)}
                        {t.status === 'sebagian' && (
                          <span className="text-honey-700"> · sisa {formatRupiah(t.nominal - t.jumlah_dibayar)}</span>
                        )}
                      </p>
                    </div>
                    {statusBadge(t.status)}
                  </li>
                )}
              />
            </div>
          </div>
        )}

        {activeTab === 'beranda' && berandaSub === 'ringkasan' && children.length > 0 && !showTagihanDetail && (
          <>
            {/* Tagihan (SPP + Tagihan Lain digabung 1 tabel) */}
            <div className="surface-card p-5 mb-6">
              {selectedChild && (
                <div className="pb-3 mb-3 border-b border-line-200">
                  <p className="font-display font-semibold text-ink-900">{selectedChild.user?.name}</p>
                  <p className="text-sm text-ink-500">
                    {selectedChild.class_room?.name || 'Belum ada kelas'} · NIS {selectedChild.nis}
                  </p>
                </div>
              )}

              <h2 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-ink-500" /> Tagihan
              </h2>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-ink-500">Tagihan SPP</p>
                    <p className={`text-xl font-display font-semibold ${sppTunggakan > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
                      {formatRupiah(sppTunggakan)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Tagihan Lain</p>
                    <p className={`text-xl font-display font-semibold ${tagihanLainTunggakan > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
                      {formatRupiah(tagihanLainTunggakan)}
                    </p>
                  </div>
                </div>
                {belumLunasCount > 0 ? (
                  <span className="badge-soft badge-rose">{belumLunasCount} tagihan belum lunas</span>
                ) : (
                  <span className="badge-soft badge-brand">Semua tagihan lunas</span>
                )}
              </div>

              <button
                onClick={() => { setShowTagihanDetail(true); setSppDetailPage(1); setLainDetailPage(1); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition mt-4"
              >
                Detail Tagihan
              </button>
            </div>

            {/* Aktivitas terkini */}
            <div className="surface-card p-5">
                {selectedChild && (
                  <div className="flex items-center justify-center flex-wrap gap-2 pb-4 mb-4 border-b border-line-200">
                    <span className="badge-soft badge-rose">Poin Pelanggaran: {selectedChild.total_poin ?? 0}</span>
                    <span className="badge-soft badge-honey">Poin Prestasi: {selectedChild.total_prestasi ?? 0}</span>
                  </div>
                )}

                <h2 className="font-display font-semibold text-ink-900 mb-4">Aktivitas Terkini</h2>

                {loading ? (
                  <p className="text-center text-ink-300 py-6">Memuat...</p>
                ) : error ? (
                  <p className="text-center text-honey-700 py-6">{error}</p>
                ) : (
                  <ul className="divide-y divide-line-200">
                    {timelinePaginated.map((item, i) => {
                      const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.absensi;
                      const Icon = config.icon;
                      return (
                        <li key={i} className="py-3 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-mist-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-4 h-4 text-ink-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-ink-900">{item.title}</p>
                              <span className="text-xs text-ink-400 shrink-0">{fmtDMY(item.date)}</span>
                            </div>
                            {item.detail && <p className="text-xs text-ink-500 mt-0.5">{item.detail}</p>}
                            {item.poin != null && (
                              <span className={`badge-soft ${config.badge} mt-1.5 inline-block`}>
                                {item.type === 'nilai' ? `Skor: ${item.poin}` : `+${item.poin} poin`}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {(!activity?.timeline || activity.timeline.length === 0) && (
                      <li className="py-6 text-center text-sm text-ink-300">Belum ada aktivitas tercatat.</li>
                    )}
                  </ul>
                )}

                {activity?.timeline?.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                      className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                    </button>
                    <span className="text-xs text-ink-400">Halaman {activityPage} / {timelineTotalPages}</span>
                    <button
                      onClick={() => setActivityPage((p) => Math.min(timelineTotalPages, p + 1))}
                      disabled={activityPage === timelineTotalPages}
                      className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
                    >
                      Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
          </>
        )}

        {activeTab === 'beranda' && berandaSub === 'ringkasan' && !showTagihanDetail && (
          <div className="mt-6">
            <LeaderboardPrestasi />
          </div>
        )}
      </div>

      {/* Navbar bawah — Beranda & Nilai, gaya sama dengan dashboard Guru */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-50">
        <div className="max-w-2xl mx-auto flex">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-brand-600' : 'text-ink-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}

    </div>
  );
}

// Daftar tagihan dipaginasi (PAGE_SIZE sama dengan Aktivitas Terkini) —
// dipakai untuk SPP & Tagihan Lain di halaman "Detail Tagihan" supaya
// riwayat bertahun-tahun tidak jadi 1 daftar panjang tak berujung,
// sama seperti pola Laporan Perorangan di dashboard TU. Halaman penuh
// (bukan popup) karena butuh 2 seksi bertumpuk (SPP + Tagihan Lain) yang
// bisa jadi panjang kalau dipaginasi.
function PaginatedTagihanList({ items, page, setPage, renderItem, emptyText }) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-4">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line-200">{paginated.map(renderItem)}</ul>
      )}
      {items.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-line-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
          </button>
          <span className="text-xs text-ink-400">Halaman {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
          >
            Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

