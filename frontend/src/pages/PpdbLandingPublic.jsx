import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Search, MapPin, ArrowRight, GraduationCap, CalendarDays, ClipboardList,
  Wallet, Info, FileEdit, UploadCloud, CheckCircle2, BadgeCheck,
} from 'lucide-react';
import api from '../api/axios';
import { useSchoolProfile } from '../context/SchoolProfileContext';
import Reveal from '../components/Reveal';

const LANGKAH = [
  { icon: FileEdit, judul: 'Isi Formulir Online', desc: 'Lengkapi data diri, orang tua/wali, dan pilihan jurusan lewat formulir pendaftaran.' },
  { icon: UploadCloud, judul: 'Unggah Berkas', desc: 'Unggah ijazah, rapor, KK, akta lahir, dan berkas persyaratan lain (boleh disusulkan).' },
  { icon: ClipboardList, judul: 'Verifikasi Sekolah', desc: 'Panitia PPDB memeriksa data & berkas, lalu memperbarui status pendaftaran.' },
  { icon: BadgeCheck, judul: 'Cek Status & Daftar Ulang', desc: 'Pantau status pakai kode pendaftaran. Kalau diterima, lanjut daftar ulang di sekolah.' },
];

/**
 * Halaman awal /ppdb — landing informasi PPDB (jurusan, jadwal, syarat,
 * biaya, alur), TIDAK berisi formulir langsung. Formulir & cek status
 * dipindah ke /ppdb/daftar (PpdbPublic.jsx) supaya halaman awal ini fokus
 * jadi "brosur digital" dulu, baru CTA ke formulir. Gaya visual mengikuti
 * /bursakerjakhusus (LowonganPublic.jsx) — 1 warna aksen brand hijau,
 * honey cuma di CTA utama.
 */
export default function PpdbLandingPublic() {
  const { profile } = useSchoolProfile();
  const [jurusanList, setJurusanList] = useState([]);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.get('/ppdb/jurusan').then((res) => setJurusanList(res.data)).catch(() => {});
    api.get('/ppdb/pengaturan').then((res) => setInfo(res.data)).catch(() => {});
  }, []);

  const infoCards = info ? [
    { key: 'jadwal_pendaftaran', icon: CalendarDays, label: 'Jadwal Pendaftaran' },
    { key: 'syarat_pendaftaran', icon: ClipboardList, label: 'Syarat Berkas Pendaftaran' },
    { key: 'biaya_pendaftaran', icon: Wallet, label: 'Biaya Pendaftaran' },
  ].filter((c) => info[c.key]?.trim()) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/70 via-mist-50 to-mist-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-line-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Link to="/ppdb" className="flex items-center gap-2 font-display font-semibold text-ink-900 text-sm">
            {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-7 h-7 object-contain" />}
            {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/ppdb/daftar?mode=status" className="hidden sm:flex items-center justify-center min-h-11 text-sm font-medium text-ink-700 hover:text-brand-600 transition px-3 focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-lg">
              Cek Status
            </Link>
            <Link to="/ppdb/daftar" className="flex items-center justify-center min-h-11 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition px-4 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-800 focus-visible:outline-offset-2">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-brand-100/70 via-brand-50/50 to-transparent">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[360px]"
          style={{ background: 'radial-gradient(ellipse at center, var(--color-brand-100) 0%, transparent 70%)', opacity: 0.5 }}
        />
        <div className="max-w-6xl mx-auto px-5 pt-8 pb-16 sm:pt-14 sm:pb-24 relative">
          <div className="flex items-center gap-8 lg:gap-14">
            <div className="flex-1 min-w-0">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 rounded-full px-3 py-1 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Penerimaan Peserta Didik Baru{info?.periode_aktif ? ` ${info.periode_aktif}` : ''}
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="font-display text-4xl sm:text-6xl font-semibold text-ink-900 mb-5 text-balance leading-[1.05]">
                  Mulai langkah baru di <span className="text-brand-600">{profile?.nama_sekolah || 'sekolah kami'}</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="text-base sm:text-lg text-ink-500 max-w-md mb-10">
                  Daftar online, unggah berkas, dan pantau status pendaftaranmu — semua dalam satu tempat, tanpa perlu antre ke sekolah.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link to="/ppdb/daftar" className="btn-primary">
                    <UserPlus className="w-4 h-4" /> Daftar Sekarang
                  </Link>
                  <Link to="/ppdb/daftar?mode=status" className="flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-600 transition px-4 py-3 rounded-xl border border-line-200 bg-white">
                    <Search className="w-4 h-4" /> Cek Status Pendaftaran
                  </Link>
                  <a href="#syarat-berkas" className="flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-600 transition px-4 py-3 rounded-xl border border-line-200 bg-white">
                    <ClipboardList className="w-4 h-4" /> Syarat Berkas Pendaftaran
                  </a>
                </div>
              </Reveal>
            </div>

            {profile?.logo_url && (
              <Reveal delay={120} className="hidden sm:block shrink-0">
                <img src={profile.logo_url} alt="Logo" className="w-36 h-36 lg:w-48 lg:h-48 object-contain" />
              </Reveal>
            )}
          </div>
        </div>
      </div>

      {/* Statistik singkat */}
      <Reveal as="div" className="border-y border-line-200">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 divide-x divide-line-200">
          <div className="py-7 sm:py-9 text-center">
            <p className="font-display text-3xl sm:text-4xl font-bold text-brand-500">{jurusanList.length || '-'}</p>
            <p className="text-xs text-ink-400 mt-1.5">Jurusan Tersedia</p>
          </div>
          <div className="py-7 sm:py-9 text-center">
            <p className={`font-display text-lg sm:text-xl font-bold ${info?.dibuka === false ? 'text-honey-700' : 'text-brand-500'}`}>
              {info == null ? '-' : info.dibuka ? 'Dibuka' : 'Ditutup'}
            </p>
            <p className="text-xs text-ink-400 mt-1.5">Status Pendaftaran</p>
          </div>
        </div>
      </Reveal>

      {/* Jurusan */}
      {jurusanList.length > 0 && (
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-300 font-semibold mb-2">Jurusan</p>
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">Program keahlian yang dibuka</h2>
            <p className="text-sm text-ink-500 mb-12">Pilih jurusan sesuai minat &amp; bakatmu — bisa diisi di formulir pendaftaran.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {jurusanList.map((j, i) => (
              <Reveal key={j.id} delay={(i % 6) * 60}>
                <div className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-line-200">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink-900">{j.nama}</p>
                    <p className="text-xs text-ink-400 font-mono mt-0.5">{j.kode}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Info PPDB (jadwal/syarat/biaya) — cuma tampil kalau diisi admin */}
      {(infoCards.length > 0 || info?.brosur_depan_url || info?.brosur_belakang_url) && (
        <div id="syarat-berkas" className="border-t border-line-200 bg-white scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-300 font-semibold mb-2">Info PPDB</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-12">Yang perlu kamu tahu</h2>
            </Reveal>
            <div className={`grid gap-6 ${infoCards.length === 1 ? '' : infoCards.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {infoCards.map((c, i) => (
                <Reveal key={c.key} delay={i * 90}>
                  <div className="h-full bg-mist-50 rounded-xl p-5 border border-line-200">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center mb-3">
                      <c.icon className="w-4 h-4 text-brand-600" />
                    </div>
                    <h3 className="font-display font-medium text-sm text-ink-900 mb-1.5">{c.label}</h3>
                    <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">{info[c.key]}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {info?.info_tambahan?.trim() && (
              <Reveal delay={infoCards.length * 90}>
                <div className="mt-6 flex items-start gap-3 bg-honey-50 border border-honey-200 rounded-xl p-4">
                  <Info className="w-4 h-4 text-honey-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-honey-800 leading-relaxed whitespace-pre-line">{info.info_tambahan}</p>
                </div>
              </Reveal>
            )}

            {(info?.brosur_depan_url || info?.brosur_belakang_url) && (
              <Reveal delay={(infoCards.length + 1) * 90}>
                <div className="mt-10 text-center">
                  <h3 className="font-display font-medium text-sm text-ink-900 mb-3">Brosur PPDB</h3>
                  <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {info.brosur_depan_url && (
                      <a href={info.brosur_depan_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-line-200 shadow-sm">
                        <img src={info.brosur_depan_url} alt="Brosur PPDB halaman depan" className="w-full h-auto object-cover" />
                      </a>
                    )}
                    {info.brosur_belakang_url && (
                      <a href={info.brosur_belakang_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-line-200 shadow-sm">
                        <img src={info.brosur_belakang_url} alt="Brosur PPDB halaman belakang" className="w-full h-auto object-cover" />
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      )}

      {/* Alur pendaftaran */}
      <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-300 font-semibold mb-2">Alur</p>
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6 sm:mb-12">Cara mendaftar</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {LANGKAH.map((l, i) => (
            <Reveal key={l.judul} delay={i * 90}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <l.icon className="w-4 h-4 text-brand-600" />
                </div>
                <div className="h-px flex-1 bg-line-200" />
                <span className="text-xs font-mono text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="font-display font-medium text-sm text-ink-900 mb-1.5">{l.judul}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{l.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Ajakan mendaftar */}
      <div className="border-t border-line-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <Reveal>
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-8 sm:p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-white/80 mx-auto mb-4" />
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">Siap bergabung?</h2>
              <p className="text-brand-100 max-w-md mx-auto mb-8">
                Isi formulir pendaftaran online sekarang, cukup beberapa menit.
              </p>
              <Link to="/ppdb/daftar" className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-6 py-3.5 rounded-xl transition">
                Daftar Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line-200">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-display font-medium text-ink-900">
            {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-6 h-6 object-contain" />}
            {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}
          </div>
          {profile?.alamat && (
            <p className="text-xs text-ink-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {profile.alamat}</p>
          )}
          <p className="text-xs text-ink-400">&copy; {new Date().getFullYear()} PPDB Online &middot; {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}</p>
        </div>
      </div>
    </div>
  );
}
