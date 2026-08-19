import { useEffect, useRef, useState } from 'react';
import { LogOut, Building2, ClipboardCheck, NotebookPen, ChevronDown, UserCog, PenTool, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import IdukaAbsensiTab from './tabs/IdukaAbsensiTab';
import IdukaJurnalPembimbinganTab from './tabs/IdukaJurnalPembimbinganTab';
import IdukaPenilaianTab from './tabs/IdukaPenilaianTab';
import TandaTanganModal from '../../components/TandaTanganModal';
import IdukaProfileModal from '../../components/IdukaProfileModal';

const TABS = [
  { key: 'absensi', label: 'Absensi', icon: ClipboardCheck, component: IdukaAbsensiTab },
  { key: 'pembimbingan', label: 'Jurnal Pembimbing', icon: NotebookPen, component: IdukaJurnalPembimbinganTab },
  { key: 'penilaian', label: 'Penilaian', icon: Star, component: IdukaPenilaianTab },
];

export default function IdukaDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('absensi');

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [showTandaTangan, setShowTandaTangan] = useState(false);
  const menuRef = useRef(null);

  const loadProfile = () => api.get('/my-iduka-profile').then((res) => setProfile(res.data));
  useEffect(() => { loadProfile(); }, []);

  // Wajib punya tanda tangan sebelum bisa pakai aplikasi — begitu profil
  // selesai dimuat dan ternyata belum ada, modal-nya otomatis terbuka
  // dan tidak bisa ditutup sampai berhasil disimpan.
  const wajibIsiTandaTangan = profile !== null && !profile.tanda_tangan_url;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60">IDUKA</p>
              <h1 className="font-display text-lg font-semibold text-white">{profile?.nama_perusahaan || user.name}</h1>
            </div>
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
              <div className="absolute right-0 z-20 mt-2 w-48 surface-card overflow-hidden">
                <button
                  onClick={() => { setShowEditProfil(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <UserCog className="w-4 h-4" /> Edit Profil
                </button>
                <button
                  onClick={() => { setShowTandaTangan(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                >
                  <PenTool className="w-4 h-4" /> Tanda Tangan
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

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Navbar bawah, mengikuti pola yang sama dengan dashboard Guru */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => {
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
        <IdukaProfileModal
          iduka={profile}
          onClose={() => setShowEditProfil(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}

      {(showTandaTangan || wajibIsiTandaTangan) && (
        <TandaTanganModal
          iduka={profile}
          onClose={() => setShowTandaTangan(false)}
          onSaved={(updated) => setProfile(updated)}
          forced={wajibIsiTandaTangan}
        />
      )}
    </div>
  );
}
