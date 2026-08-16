import { Radar } from 'lucide-react';
import { useSchoolProfile } from '../context/SchoolProfileContext';

/**
 * Halaman ditampilkan ke SEMUA pengunjung (siapa pun yang belum login
 * sebagai admin) selama mode maintenance nyala — lihat MaintenanceGate di
 * App.jsx. Tidak ada tautan login di halaman ini (sengaja disembunyikan) —
 * admin tetap bisa masuk lewat /login langsung (rute itu tidak diblokir
 * untuk admin, lihat AuthController::login() & CheckMaintenanceMode).
 */
export default function MaintenancePage() {
  const { profile } = useSchoolProfile();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0B1B3A 0%, #0B1B3A 55%, #061024 100%)' }}
    >
      {/* Garis radar melingkar, cuma dekorasi — tidak menutupi konten */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="w-[420px] h-[420px] rounded-full border border-white/[0.05]" />
        <span className="absolute w-[300px] h-[300px] rounded-full border border-white/[0.06]" />
        <span className="absolute w-[180px] h-[180px] rounded-full border border-white/[0.07]" />
        <span className="absolute w-[420px] h-[420px] rounded-full border border-[#F2B705]/20 motion-safe:animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
      </div>

      <div className="w-full max-w-sm relative z-10 text-center">
        <div className="relative w-16 h-16 mx-auto mb-8 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#F2B705]/10 motion-safe:animate-[ping_2s_ease-in-out_infinite]" />
          <span className="relative w-16 h-16 rounded-full border border-[#F2B705]/40 bg-[#0B1B3A] flex items-center justify-center overflow-hidden">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-9 h-9 object-contain" />
            ) : (
              <Radar className="w-7 h-7 text-[#F2B705]" strokeWidth={1.75} />
            )}
          </span>
        </div>

        <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-[#3FB27F] mb-4">
          Pemberitahuan Sistem
        </p>

        <h1 className="font-display text-2xl sm:text-[28px] font-bold text-white mb-3 text-balance leading-snug">
          Mohon Maaf, Kami Sedang<br />Membenahi Sistem
        </h1>
        <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
          Tim kami sedang melakukan pemeliharaan untuk meningkatkan kualitas layanan{profile?.nama_sekolah ? ` ${profile.nama_sekolah}` : ''}.
          Mohon coba akses kembali beberapa saat lagi.
        </p>

        <div className="mt-9 h-[3px] w-full max-w-[200px] mx-auto rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#F2B705] to-[#3FB27F] motion-safe:animate-[maintenance-sweep_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes maintenance-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
