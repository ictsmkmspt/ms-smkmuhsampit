import { useState } from 'react';
import {
  LogOut, Database, ClipboardList, ClipboardCheck, Settings, ChevronDown, ChevronLeft, ChevronRight, Menu, X,
  Users, GraduationCap, School, UserCog, Briefcase, LayoutDashboard, Building2,
  Clock, AlertOctagon, Trophy, CalendarDays, Wallet, Pencil, Image, ShieldCheck,
  AlertTriangle, BookOpen, BookMarked, ScrollText, CalendarClock, CalendarRange, Warehouse, Boxes, Wrench, PackagePlus, UserPlus, DatabaseBackup, FlaskConical, Sparkles, HardHat, HeartHandshake, FileBarChart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import MasterDataTab, { MASTER_DATA_SUBMENU } from './tabs/MasterDataTab';
import AlumniMenuTab, { ALUMNI_SUBMENU } from './tabs/AlumniMenuTab';
import PoinTab, { POIN_SUBMENU } from './tabs/PoinTab';
import SettingsTab, { SETTINGS_SUBMENU } from './tabs/SettingsTab';
import PklTab, { PKL_SUBMENU } from './tabs/PklTab';
import PengembanganTab, { PENGEMBANGAN_SUBMENU } from './tabs/PengembanganTab';
import KurikulumTab, { KURIKULUM_SUBMENU } from './tabs/KurikulumTab';
import SarprasTab, { SARPRAS_SUBMENU } from './tabs/SarprasTab';
import RoomStaffTab from './sarpras/RoomStaffTab';
import DashboardHomeTab from './tabs/DashboardHomeTab';
import LaporanTab, { LAPORAN_SUBMENU } from './tabs/LaporanTab';
import EditProfileModal from '../../components/EditProfileModal';
import { TahunAjaranProvider, useTahunAjaran } from '../../context/TahunAjaranContext';

const ROLE_LABEL = {
  admin: 'Super Admin',
  waka: 'Admin',
  waka_kesiswaan: 'Waka Kesiswaan',
  waka_kurikulum: 'Waka Kurikulum',
  waka_humas: 'Waka Humas',
  waka_sarpras: 'Waka Sarpras',
};

const MASTER_ICONS = { siswa: Users, guru: GraduationCap, kelas: School, wali: UserCog, tu: Wallet, bk: HeartHandshake, admin: ShieldCheck };
const ALUMNI_ICONS = { siswa: GraduationCap, wali: UserCog };
const SETTINGS_ICONS = { sekolah: Image, jam: Clock, backup: DatabaseBackup };
const PKL_ICONS = { dudi: Building2, penempatan: ClipboardList, monitoring: CalendarClock };
const LAPORAN_ICONS = { absensi: ClipboardCheck, pelanggaran: AlertOctagon, prestasi: Trophy, bk: HeartHandshake, 'nilai-akademik': ClipboardList, tahsin: BookOpen, tahfidz: BookMarked, tadarus: ScrollText };
const POIN_ICONS = { 'jenis-pelanggaran': AlertOctagon, 'jenis-prestasi': Trophy, sanksi: AlertTriangle };
const KURIKULUM_ICONS = { kalender: CalendarRange, akademik: CalendarRange, libur: CalendarDays, mapel: BookOpen, tugas: UserCog, jadwal: CalendarClock, template: Sparkles };
const SARPRAS_ICONS = { ruang: Warehouse, aset: Boxes, pemeliharaan: Wrench };
const PENGEMBANGAN_ICONS = { ppdb: UserPlus, pengadaan: PackagePlus };

export default function AdminDashboard() {
  return (
    <TahunAjaranProvider>
      <AdminDashboardContent />
    </TahunAjaranProvider>
  );
}

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { profile } = useSchoolProfile();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Tiap peran Waka cuma lihat menu & sub-menu sesuai bidangnya sendiri —
  // Super Admin (role "admin") selalu lihat semuanya. `restrictTo` di tiap
  // entri submenu (dan `roles` di tiap tab) berisi daftar role waka_* yang
  // boleh melihatnya, selain admin.
  const bisaLihat = (allowed) => !allowed || user.role === 'admin' || allowed.includes(user.role);
  const masterDataSubmenu = MASTER_DATA_SUBMENU
    .filter((s) => !s.adminOnly || user.role === 'admin')
    .filter((s) => bisaLihat(s.restrictTo));
  const settingsSubmenu = SETTINGS_SUBMENU.filter((s) => bisaLihat(s.restrictTo));
  const pklSubmenu = PKL_SUBMENU.filter((s) => bisaLihat(s.restrictTo));
  const poinSubmenu = POIN_SUBMENU.filter((s) => bisaLihat(s.restrictTo));
  const laporanSubmenu = LAPORAN_SUBMENU.filter((s) => bisaLihat(s.restrictTo));

  const TABS = [
    { key: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, component: DashboardHomeTab },
    { key: 'master',     label: 'Master Data', icon: Database,        hasDropdown: true, submenu: masterDataSubmenu, subIcons: MASTER_ICONS, roles: ['waka_kesiswaan', 'waka_kurikulum'] },
    { key: 'alumni',     label: 'Alumni',      icon: GraduationCap,   hasDropdown: true, submenu: ALUMNI_SUBMENU, subIcons: ALUMNI_ICONS, roles: ['waka_kesiswaan', 'waka_humas'] },
    { key: 'laporan',    label: 'Laporan',     icon: FileBarChart,   hasDropdown: true, submenu: laporanSubmenu, subIcons: LAPORAN_ICONS, roles: ['waka_kesiswaan', 'waka_kurikulum'] },
    { key: 'poin',       label: 'Poin',        icon: ClipboardList,   hasDropdown: true, submenu: poinSubmenu, subIcons: POIN_ICONS, roles: ['waka_kesiswaan'] },
    { key: 'pkl',        label: 'PKL',         icon: Briefcase,       hasDropdown: true, submenu: pklSubmenu, subIcons: PKL_ICONS, roles: ['waka_humas', 'waka_kurikulum'] },
    { key: 'kurikulum',  label: 'Pembelajaran', icon: BookOpen,        hasDropdown: true, submenu: KURIKULUM_SUBMENU, subIcons: KURIKULUM_ICONS, roles: ['waka_kurikulum'] },
    { key: 'sarpras-staf', label: 'Teknisi & Kepala Bengkel', icon: HardHat, component: RoomStaffTab, roles: ['waka_sarpras'] },
    { key: 'sarpras',    label: 'Sarana dan Prasarana', icon: Wrench, hasDropdown: true, submenu: SARPRAS_SUBMENU, subIcons: SARPRAS_ICONS, roles: ['waka_sarpras'] },
    { key: 'pengaturan', label: 'Pengaturan',  icon: Settings,        hasDropdown: true, submenu: settingsSubmenu, subIcons: SETTINGS_ICONS, roles: [] },
    { key: 'pengembangan', label: 'Pengembangan', icon: FlaskConical, hasDropdown: true, submenu: PENGEMBANGAN_SUBMENU, subIcons: PENGEMBANGAN_ICONS, roles: [] },
  ].filter((t) => bisaLihat(t.roles));
  // Default sub Master Data beda per peran karena "guru"/"tu" disembunyikan
  // dari Kesiswaan (dan sebaliknya siswa/kelas/wali/alumni cuma milik
  // Kesiswaan) — kalau dipaksa 1 default yang sama, submenu yang aktif saat
  // pertama buka bisa jadi tidak kelihatan di sidebar peran tersebut.
  const [activeMasterSub, setActiveMasterSub] = useState(user.role === 'waka_kesiswaan' ? 'kelas' : 'guru');
  const [activeAlumniSub, setActiveAlumniSub] = useState('siswa');
  const [activeSettingsSub, setActiveSettingsSub] = useState('jam');
  const [activePklSub, setActivePklSub] = useState('dudi');
  const [activePengembanganSub, setActivePengembanganSub] = useState('ppdb');
  const [activePoinSub, setActivePoinSub] = useState('jenis-pelanggaran');
  // Default beda per peran — Waka Kurikulum cuma punya akses ke
  // "nilai-akademik" di menu Laporan ini, sub lain milik Kesiswaan.
  const [activeLaporanSub, setActiveLaporanSub] = useState(user.role === 'waka_kurikulum' ? 'nilai-akademik' : 'absensi');
  const [activeKurikulumSub, setActiveKurikulumSub] = useState('akademik');
  const [activeSarprasSub, setActiveSarprasSub] = useState('ruang');
  const [openDropdown, setOpenDropdown] = useState(null); // 'master' | 'pengaturan' | null
  const [openNested, setOpenNested] = useState(null); // "${tabKey}.${groupKey}" | null — submenu bertingkat (mis. Kalender di Pembelajaran)
  const [collapsed, setCollapsed] = useState(false); // toggle sidebar desktop
  const [mobileOpen, setMobileOpen] = useState(false); // toggle dropdown menu di HP
  const [showEditProfil, setShowEditProfil] = useState(false);
  const { list: tahunAjaranList, selectedId: tahunAjaranId, setSelectedId: setTahunAjaranId } = useTahunAjaran();

  const active = TABS.find((t) => t.key === activeTab) || TABS[0];
  const ActiveComponent = active?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  // Tiap tab yang punya dropdown punya "sub aktif" masing-masing sendiri,
  // disimpan terpisah supaya tidak saling menimpa.
  const subStateFor = (key) => {
    if (key === 'master') return [activeMasterSub, setActiveMasterSub];
    if (key === 'alumni') return [activeAlumniSub, setActiveAlumniSub];
    if (key === 'pengaturan') return [activeSettingsSub, setActiveSettingsSub];
    if (key === 'pkl') return [activePklSub, setActivePklSub];
    if (key === 'pengembangan') return [activePengembanganSub, setActivePengembanganSub];
    if (key === 'poin') return [activePoinSub, setActivePoinSub];
    if (key === 'laporan') return [activeLaporanSub, setActiveLaporanSub];
    if (key === 'kurikulum') return [activeKurikulumSub, setActiveKurikulumSub];
    if (key === 'sarpras') return [activeSarprasSub, setActiveSarprasSub];
    return [null, () => {}];
  };

  // Dipakai tombol pintasan di Dashboard (mis. panduan awal per role) buat
  // langsung pindah ke tab+sub tertentu tanpa user harus cari sendiri di sidebar.
  const gotoTab = (tabKey, subKey) => {
    setActiveTab(tabKey);
    if (subKey) {
      const [, setSub] = subStateFor(tabKey);
      setSub(subKey);
    }
  };

  const handleTabClick = (tab) => {
    if (collapsed) setCollapsed(false);
    if (tab.hasDropdown) {
      // Klik nama menunya cuma buka/tutup dropdown — belum langsung pindah
      // konten. Kontennya baru aktif setelah salah satu sub-menu dipilih.
      setOpenDropdown((prev) => (prev === tab.key ? null : tab.key));
    } else {
      setActiveTab(tab.key);
      setMobileOpen(false);
    }
  };

  const navItems = (variant) => TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.key;
    const isCollapsed = variant === 'desktop' && collapsed;

    if (tab.hasDropdown) {
      const isOpen = openDropdown === tab.key;
      const [activeSub, setActiveSub] = subStateFor(tab.key);

      return (
        <div key={tab.key}>
          <button
            onClick={() => handleTabClick(tab)}
            title={isCollapsed ? tab.label : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } ${isActive || isOpen ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
          >
            <span className="flex items-center gap-2"><Icon className="w-4 h-4 shrink-0" /> {!isCollapsed && tab.label}</span>
            {!isCollapsed && (
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {!isCollapsed && isOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
              {tab.submenu.map((sub) => {
                // Submenu bertingkat (mis. "Kalender" berisi Kalender
                // Akademik & Kalender Libur) — grup ini sendiri tidak
                // langsung membuka konten, cuma expand/collapse anaknya.
                if (sub.children) {
                  const nestedKey = `${tab.key}.${sub.key}`;
                  const grupPunyaAnakAktif = activeTab === tab.key && sub.children.some((c) => c.key === activeSub);
                  const nestedOpen = openNested === nestedKey || (openNested === null && grupPunyaAnakAktif);
                  const GroupIcon = tab.subIcons[sub.key];
                  return (
                    <div key={sub.key}>
                      <button
                        onClick={() => setOpenNested((prev) => (prev === nestedKey ? null : nestedKey))}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition ${
                          grupPunyaAnakAktif ? 'text-[#F2B705] font-medium' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2"><GroupIcon className="w-3.5 h-3.5" /> {sub.label}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${nestedOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {nestedOpen && (
                        <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                          {sub.children.map((anak) => {
                            const ChildIcon = tab.subIcons[anak.key];
                            const childActive = activeTab === tab.key && activeSub === anak.key;
                            return (
                              <button
                                key={anak.key}
                                onClick={() => { setActiveSub(anak.key); setActiveTab(tab.key); setMobileOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition ${
                                  childActive ? 'text-[#F2B705] font-medium' : 'text-white/60 hover:text-white'
                                }`}
                              >
                                <ChildIcon className="w-3.5 h-3.5" /> {anak.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const SubIcon = tab.subIcons[sub.key];
                const subActive = activeTab === tab.key && activeSub === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => { setActiveSub(sub.key); setActiveTab(tab.key); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition ${
                      subActive ? 'text-[#F2B705] font-medium' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" /> {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={tab.key}
        onClick={() => handleTabClick(tab)}
        title={isCollapsed ? tab.label : undefined}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
          isCollapsed ? 'justify-center' : ''
        } ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
      >
        <Icon className="w-4 h-4 shrink-0" /> {!isCollapsed && tab.label}
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-mist-50">
      {/* ===== Navbar atas — HP saja (md:hidden) ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0B1B3A] z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-8 h-8 rounded-full object-contain bg-white shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[#0B1B3A] text-[10px]">SM</span>
              </div>
            )}
            <p className="font-display font-bold text-white text-xs truncate">{profile.nama_sekolah.toUpperCase()}</p>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown menu — muncul di bawah navbar, bukan menyempitkan konten */}
        {mobileOpen && (
          <div className="border-t border-white/10 px-3 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {navItems('mobile')}
            <div className="pt-2 mt-2 border-t border-white/10">
              <button
                onClick={() => { setShowEditProfil(true); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
              >
                <Pencil className="w-4 h-4" /> Edit Profil
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Sidebar kiri — desktop saja (hidden md:flex) ===== */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-[#0B1B3A] fixed left-0 top-0 bottom-0 flex-col z-30 transition-all duration-200`}
      >
        <div className="relative">
          <div className={`px-5 py-5 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-10 h-10 rounded-full object-contain bg-white shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[#0B1B3A] text-xs">SM</span>
              </div>
            )}
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="font-display font-bold text-white text-xs tracking-wide">{profile.nama_sekolah}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => { setCollapsed((v) => !v); setOpenDropdown(null); }}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#F2B705] text-[#0B1B3A] flex items-center justify-center shadow hover:brightness-95 transition"
            title={collapsed ? 'Perbesar sidebar' : 'Perkecil sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className={`px-5 py-4 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/50">{ROLE_LABEL[user.role] || 'Super Admin'}</p>
              </div>
              <button
                onClick={() => setShowEditProfil(true)}
                title="Edit Profil"
                className="shrink-0 text-white/50 hover:text-[#F2B705] transition"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {!collapsed && tahunAjaranList.length > 0 && (
          <div className="px-3 pt-3">
            <select
              value={tahunAjaranId}
              onChange={(e) => setTahunAjaranId(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F2B705]"
            >
              {tahunAjaranList.map((t) => (
                <option key={t.id} value={t.id} className="text-ink-900">
                  {t.nama}{t.status === 'aktif' ? ' (Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems('desktop')}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            title={collapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" /> {!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* ===== Konten utama ===== */}
      <div className={`mt-14 md:mt-0 ${collapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-200`}>
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          {activeTab === 'master' ? (
            <MasterDataTab activeSub={activeMasterSub} />
          ) : activeTab === 'alumni' ? (
            <AlumniMenuTab activeSub={activeAlumniSub} />
          ) : activeTab === 'pengaturan' ? (
            <SettingsTab activeSub={activeSettingsSub} />
          ) : activeTab === 'pkl' ? (
            <PklTab activeSub={activePklSub} />
          ) : activeTab === 'pengembangan' ? (
            <PengembanganTab activeSub={activePengembanganSub} />
          ) : activeTab === 'laporan' ? (
            <LaporanTab activeSub={activeLaporanSub} />
          ) : activeTab === 'poin' ? (
            <PoinTab activeSub={activePoinSub} />
          ) : activeTab === 'kurikulum' ? (
            <KurikulumTab activeSub={activeKurikulumSub} />
          ) : activeTab === 'sarpras' ? (
            <SarprasTab activeSub={activeSarprasSub} />
          ) : (
            ActiveComponent && <ActiveComponent onNavigate={gotoTab} />
          )}
        </div>
      </div>

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}
