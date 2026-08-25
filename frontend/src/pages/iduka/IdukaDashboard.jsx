import { useEffect, useRef, useState } from 'react';
import { LogOut, Building2, ChevronDown, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import IdukaProfileModal from '../../components/IdukaProfileModal';
import NotificationBell from '../../components/NotificationBell';
import LowonganTab from './LowonganTab';

/**
 * Dashboard akun IDUKA — akun login milik perusahaan mitra sendiri (beda
 * dari akun Instruktur untuk PKL). Isinya kelola lowongan kerja (BKK)
 * milik perusahaan ini.
 */
export default function IdukaDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get('/my-iduka-profile').then((res) => setProfile(res.data));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          <div className="flex items-center gap-4">
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
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        <LowonganTab />
      </div>

      {showEditProfil && (
        <IdukaProfileModal
          iduka={profile}
          onClose={() => setShowEditProfil(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
