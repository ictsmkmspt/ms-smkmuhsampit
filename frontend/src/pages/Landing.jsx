import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Building2, Briefcase, Play, ArrowRight, LogIn,
  CheckCircle2,
} from 'lucide-react';

/**
 * Ikon media sosial custom (garis tipis, gaya senada lucide-react) — dibuat manual
 * karena versi lucide-react di proyek ini sudah tidak menyediakan ikon merek
 * (Facebook/Instagram/YouTube) sejak beberapa versi terakhir.
 */
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 9h2V6h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V9.5c0-.3.2-.5.5-.5Z" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M10 9.5v5l4.5-2.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const NAV_ITEMS = ['Beranda', 'Profil', 'Berita', 'Informasi', 'Galeri', 'Kontak'];

const FEATURES = [
  {
    key: 'cbt',
    icon: Monitor,
    color: '#0B1B3A',
    softText: 'text-[#0B1B3A]',
    title: 'CBT',
    subtitle: 'Computer Based Test',
    subtitleColor: 'text-[#1D4ED8]',
    desc: 'Aplikasi ujian online yang mudah, aman, dan terintegrasi untuk mendukung evaluasi pembelajaran.',
    cta: 'Masuk ke CBT',
    btnClass: 'bg-[#0B1B3A] hover:bg-[#132a52]',
    action: 'notify',
  },
  {
    key: 'manajemen',
    icon: Building2,
    color: '#15803D',
    softText: 'text-[#15803D]',
    title: 'MANAJEMEN SEKOLAH',
    subtitle: 'Sistem Informasi Sekolah',
    subtitleColor: 'text-[#15803D]',
    desc: 'Kelola data sekolah, akademik, keuangan, kepegawaian, dan administrasi dalam satu sistem terintegrasi.',
    cta: 'Masuk ke Manajemen Sekolah',
    btnClass: 'bg-[#15803D] hover:bg-[#116530]',
    action: 'login',
  },
  {
    key: 'pkl',
    icon: Briefcase,
    color: '#F2B705',
    softText: 'text-[#B8860B]',
    title: 'PKL',
    subtitle: 'Praktik Kerja Lapangan',
    subtitleColor: 'text-[#B8860B]',
    desc: 'Aplikasi untuk monitoring, penilaian, dan laporan kegiatan Praktik Kerja Lapangan (PKL).',
    cta: 'Masuk ke PKL',
    btnClass: 'bg-[#F2B705] hover:bg-[#dba500] text-[#0B1B3A]',
    action: 'notify',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);

  const notify = (msg = 'Fitur ini sedang dalam pengembangan.') => {
    clearTimeout(timerRef.current);
    setToast(msg);
    timerRef.current = setTimeout(() => setToast(''), 2600);
  };

  const handleFeatureClick = (feature) => {
    if (feature.action === 'login') {
      navigate('/login');
    } else {
      notify(`"${feature.cta}" sedang dalam pengembangan.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] font-sans">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 bg-[#0B1B3A]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-[#0B1B3A] text-sm">SM</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="font-display font-bold text-white text-sm tracking-wide">SMK MUHAMMADIYAH</p>
              <p className="font-display font-bold text-[#F2B705] text-sm tracking-wide">SAMPIT</p>
            </div>
            <div className="hidden md:block w-px h-8 bg-white/15 ml-2" />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item}
                onClick={() => notify(`Halaman "${item}" sedang dalam pengembangan.`)}
                className={`relative text-sm font-medium pb-1 transition ${
                  i === 0 ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {item}
                {i === 0 && <span className="absolute left-0 -bottom-0.5 w-full h-0.5 bg-[#F2B705] rounded-full" />}
              </button>
            ))}
          </nav>

          <button
            onClick={() => notify('Fitur Login umum sedang dalam pengembangan. Gunakan "Masuk ke Manajemen Sekolah" untuk login sistem informasi sekolah.')}
            className="flex items-center gap-2 bg-[#F2B705] hover:bg-[#dba500] text-[#0B1B3A] font-semibold text-sm px-5 py-2.5 rounded-full transition"
          >
            <LogIn className="w-4 h-4" /> Login
          </button>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-[#0B1B3A]">
        {/* dot grid decoration */}
        <div
          className="absolute top-10 left-6 w-40 h-40 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #F2B705 1.5px, transparent 1.5px)',
            backgroundSize: '14px 14px',
          }}
        />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-16 lg:py-20 relative">
          <div className="relative z-10">
            <p className="text-[#3FB27F] font-semibold text-sm tracking-wide mb-3 border-b-2 border-[#F2B705] inline-block pb-1">
              Selamat Datang di
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight text-white mb-2">
              SMK MUHAMMADIYAH
            </h1>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight text-[#3FB27F] mb-5">
              SAMPIT
            </h1>
            <p className="text-white/70 text-base sm:text-lg max-w-md mb-8">
              Sekolah berkarakter islami, berprestasi, dan berdaya saing global untuk masa depan yang gemilang.
            </p>
            <button
              onClick={() => notify('Video profil sekolah sedang dalam pengembangan.')}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-medium px-5 py-3 rounded-full transition"
            >
              <span className="w-8 h-8 rounded-full bg-[#3FB27F] flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </span>
              Profil Sekolah
            </button>
          </div>

          <div className="relative z-10 flex justify-center lg:justify-end">
            <BuildingIllustration />
          </div>
        </div>

        {/* bottom gold swoosh */}
        <svg
          className="absolute bottom-0 left-0 w-full text-[#F2B705]"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          style={{ height: '70px' }}
        >
          <path
            fill="currentColor"
            d="M0,40 C240,90 1200,-10 1440,50 L1440,90 L0,90 Z"
          />
        </svg>
      </section>

      {/* ===== FEATURE CARDS ===== */}
      <section className="max-w-7xl mx-auto px-6 -mt-6 relative z-20 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className="rounded-2xl overflow-hidden bg-white shadow-xl shadow-black/5">
                <div className="relative h-24" style={{ backgroundColor: f.color }}>
                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 w-[160%] h-16 bg-white rounded-[100%]" />
                  <div className="absolute inset-x-0 -bottom-9 flex justify-center">
                    <div className="w-[72px] h-[72px] rounded-full bg-white shadow-md flex items-center justify-center">
                      <Icon className="w-8 h-8" style={{ color: f.color }} />
                    </div>
                  </div>
                </div>

                <div className="pt-14 pb-8 px-6 text-center flex flex-col items-center">
                  <h3 className="font-display font-bold text-lg text-[#0B1B3A] tracking-wide">{f.title}</h3>
                  <p className={`text-sm font-semibold mt-1 ${f.subtitleColor}`}>{f.subtitle}</p>
                  <span className="w-10 h-0.5 rounded-full mt-3 mb-4" style={{ backgroundColor: f.color }} />
                  <p className="text-sm text-ink-500 leading-relaxed mb-6">{f.desc}</p>
                  <button
                    onClick={() => handleFeatureClick(f)}
                    className={`w-full flex items-center justify-center gap-2 text-white font-medium text-sm px-4 py-3 rounded-xl transition ${f.btnClass}`}
                  >
                    {f.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#0B1B3A]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm">Ikuti Kami</span>
            {[FacebookIcon, InstagramIcon, YoutubeIcon].map((Icon, i) => (
              <button
                key={i}
                onClick={() => notify('Tautan sosial media sedang dalam pengembangan.')}
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition"
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <p className="text-[#3FB27F] text-sm italic font-medium text-center">
            &ldquo; Berilmu, Beriman, Beramal &rdquo;
          </p>

          <p className="text-white/50 text-xs text-center">
            © {new Date().getFullYear()} SMK Muhammadiyah Sampit. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ===== TOAST NOTIFICATION ===== */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-2.5 bg-[#0B1B3A] text-white text-sm font-medium pl-4 pr-5 py-3 rounded-full shadow-2xl border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-[#F2B705] shrink-0" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ilustrasi gedung sekolah bergaya flat/vector — placeholder pengganti foto asli,
 * memakai palet warna sekolah (navy/hijau/kuning) supaya tetap serasi dengan desain.
 * Ganti dengan <img src="..." /> kapan pun foto gedung sekolah yang asli sudah ada.
 */
function BuildingIllustration() {
  return (
    <svg viewBox="0 0 420 340" className="w-full max-w-md drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="210" cy="310" rx="180" ry="18" fill="#000" opacity="0.15" />

      {/* main building block */}
      <rect x="60" y="90" width="300" height="200" rx="6" fill="#0F2A52" />
      <rect x="60" y="90" width="300" height="34" fill="#F2B705" />

      {/* left wing */}
      <rect x="20" y="150" width="60" height="140" rx="4" fill="#15803D" />

      {/* right wing */}
      <rect x="340" y="130" width="60" height="160" rx="4" fill="#15803D" />

      {/* windows grid */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={82 + col * 44}
            y={140 + row * 30}
            width="26"
            height="18"
            rx="2"
            fill="#9FD8C4"
            opacity="0.9"
          />
        ))
      )}

      {/* entrance canopy */}
      <rect x="170" y="255" width="80" height="35" fill="#F4F6FA" />
      <rect x="160" y="248" width="100" height="10" rx="2" fill="#F2B705" />

      {/* emblem */}
      <circle cx="210" cy="107" r="12" fill="#F4F6FA" />
      <circle cx="210" cy="107" r="8" fill="#15803D" />
    </svg>
  );
}
