import { useEffect, useRef, useState } from 'react';
import { LogOut, School, Trophy, AlertOctagon, Clock, ChevronDown, ChevronLeft, ChevronRight, Wallet, UserCog, X, Home, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import LeaderboardPrestasi from '../../components/LeaderboardPrestasi';
import EditProfileModal from '../../components/EditProfileModal';
import KalenderAkademikView from '../../components/KalenderAkademikView';

const TABS = [
  { key: 'beranda', label: 'Beranda', icon: Home },
  { key: 'pembelajaran', label: 'Pembelajaran', icon: BookOpen },
];

const PAGE_SIZE = 5;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

const TYPE_CONFIG = {
  absensi: { icon: Clock, badge: 'badge-brand' },
  pelanggaran: { icon: AlertOctagon, badge: 'badge-rose' },
  prestasi: { icon: Trophy, badge: 'badge-honey' },
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
  const [showSppDetail, setShowSppDetail] = useState(false);
  const [showTagihanLainDetail, setShowTagihanLainDetail] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [activeTab, setActiveTab] = useState('beranda');
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
    setShowSppDetail(false);
    setShowTagihanLainDetail(false);
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
    <div className="min-h-screen bg-mist-50">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-white/60">Orang Tua / Wali</p>
            <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
          </div>
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

      <div className="max-w-2xl mx-auto px-6 pt-6 pb-24">
        {activeTab === 'pembelajaran' && <KalenderAkademikView />}

        {activeTab === 'beranda' && children.length === 0 && !loading && (
          <div className="surface-card p-6 text-center">
            <School className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada data anak yang terhubung ke akun ini. Hubungi admin sekolah untuk menghubungkan akun.</p>
          </div>
        )}

        {activeTab === 'beranda' && children.length > 0 && (
          <>
            {/* Pemilih anak, cuma tampil kalau lebih dari 1 anak */}
            {children.length > 1 && (
              <div className="relative mb-5 w-72">
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

            {/* Tagihan (SPP + Tagihan Lain digabung 1 tabel) */}
            <div className="surface-card p-5 mb-6">
              <h2 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-ink-500" /> Tagihan
              </h2>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-ink-500">Tunggakan SPP</p>
                    <p className={`text-xl font-display font-semibold ${sppTunggakan > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
                      {formatRupiah(sppTunggakan)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Tunggakan Tagihan Lain</p>
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

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setShowSppDetail(true)}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
                >
                  Detail SPP
                </button>
                <button
                  onClick={() => setShowTagihanLainDetail(true)}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
                >
                  Detail Tagihan Lain
                </button>
              </div>
            </div>

            {/* Aktivitas terkini */}
            <div className="surface-card p-5">
              {selectedChild && (
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-line-200">
                  <div>
                    <h2 className="font-display font-semibold text-ink-900 text-lg">{selectedChild.user?.name}</h2>
                    <p className="text-sm text-ink-500">
                      {selectedChild.class_room?.name || 'Belum ada kelas'} · NIS {selectedChild.nis}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="badge-soft badge-rose">Poin Pelanggaran: {selectedChild.total_poin ?? 0}</span>
                    <span className="badge-soft badge-honey">Poin Prestasi: {selectedChild.total_prestasi ?? 0}</span>
                  </div>
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
                            <span className="text-xs text-ink-400 shrink-0">{item.date}</span>
                          </div>
                          {item.detail && <p className="text-xs text-ink-500 mt-0.5">{item.detail}</p>}
                          {item.poin != null && (
                            <span className={`badge-soft ${config.badge} mt-1.5 inline-block`}>
                              {item.type === 'prestasi' ? '+' : '+'}{item.poin} poin
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

        {activeTab === 'beranda' && (
          <div className="mt-6">
            <LeaderboardPrestasi />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-40">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
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

      {showSppDetail && (
        <TagihanDetailModal title="Detail SPP" onClose={() => setShowSppDetail(false)}>
          {spp.length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-6">Belum ada tagihan SPP tercatat.</p>
          ) : (
            <ul className="divide-y divide-line-200">
              {spp.map((s) => (
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
              ))}
            </ul>
          )}
        </TagihanDetailModal>
      )}

      {showTagihanLainDetail && (
        <TagihanDetailModal title="Detail Tagihan Lain" onClose={() => setShowTagihanLainDetail(false)}>
          {tagihanLain.length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-6">Belum ada tagihan lain tercatat.</p>
          ) : (
            <ul className="divide-y divide-line-200">
              {tagihanLain.map((t) => (
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
              ))}
            </ul>
          )}
        </TagihanDetailModal>
      )}
    </div>
  );
}

function TagihanDetailModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
          <h3 className="font-display font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
