import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, School, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = { guru: '/guru', siswa: '/siswa', admin: '/admin', waka_kurikulum: '/waka-kurikulum' };

// Menu "Profil" Portal CBT — posisinya meniru dashboard SIM Sekolah
// (GuruDashboard/SiswaDashboard), isinya "Sekolah" & Keluar. Portal CBT
// tidak punya menunya sendiri di luar CBT, jadi "Sekolah" di sini cuma
// mengalihkan balik ke dashboard SIM Sekolah (termasuk Edit Profil di
// sana). Pengawas Ujian TIDAK punya dashboard SIM sendiri (akunnya cuma
// dipakai buat Portal CBT ini) — makanya tombol "Sekolah" disembunyikan
// untuk role itu, cuma Keluar yang tersisa.
export default function CbtProfilMenu({ role, openUpward = false }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/ujian/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-[#F2B705] transition"
      >
        Profil
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 z-20 w-48 surface-card overflow-hidden ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {ROLE_HOME[role] && (
            <button
              onClick={() => { setOpen(false); navigate(ROLE_HOME[role]); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
            >
              <School className="w-4 h-4" /> Sekolah
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
