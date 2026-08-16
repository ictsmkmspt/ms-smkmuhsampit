import { Link } from 'react-router-dom';
import { Wrench, Cog, Sparkles } from 'lucide-react';
import { useSchoolProfile } from '../context/SchoolProfileContext';

/**
 * Halaman ditampilkan ke SEMUA pengunjung (siapa pun yang belum login
 * sebagai admin) selama mode maintenance nyala — lihat MaintenanceGate di
 * App.jsx. Link "Masuk sebagai Staf" tetap ada supaya admin bisa login dan
 * mematikan mode ini lagi (endpoint /login TIDAK diblokir untuk admin,
 * lihat AuthController::login() & CheckMaintenanceMode).
 */
export default function MaintenancePage() {
  const { profile } = useSchoolProfile();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1B3A] px-4 py-10 relative overflow-hidden">
      <div
        className="absolute top-10 left-6 w-40 h-40 opacity-30 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #F2B705 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />
      <div
        className="absolute bottom-10 right-6 w-40 h-40 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #3FB27F 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.15] pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(circle, #F2B705, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-[0.15] pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(circle, #3FB27F, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10 text-center">
        {profile?.logo_url && (
          <img src={profile.logo_url} alt="Logo Sekolah" className="w-14 h-14 object-contain mx-auto mb-4 opacity-90" />
        )}

        <div className="relative w-24 h-24 mx-auto mb-6">
          <Cog
            className="w-24 h-24 text-white/10 absolute inset-0 motion-safe:animate-[spin_12s_linear_infinite]"
            strokeWidth={1.5}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F2B705] to-[#c99700] flex items-center justify-center shadow-[0_8px_30px_rgba(242,183,5,0.35)] motion-safe:animate-[pulse_2.5s_ease-in-out_infinite]">
              <Wrench className="w-7 h-7 text-[#0B1B3A]" strokeWidth={2.25} />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-[#F2B705] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Sedang Ditingkatkan
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3 text-balance">
          Sistem Sedang Dalam Pemeliharaan
        </h1>
        <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
          Kami sedang melakukan pemeliharaan terjadwal untuk meningkatkan layanan{profile?.nama_sekolah ? ` ${profile.nama_sekolah}` : ''}.
          Mohon coba akses kembali beberapa saat lagi. Terima kasih atas kesabarannya.
        </p>

        <span className="block mt-6 mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-[#F2B705] to-[#3FB27F]" />

        <Link
          to="/login"
          className="inline-block mt-8 text-xs text-white/30 hover:text-white/60 transition"
        >
          Masuk sebagai Staf
        </Link>
      </div>
    </div>
  );
}
