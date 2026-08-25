import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Building2, MapPin, UserPlus, Send, CheckCircle2, ArrowRight, Wallet,
} from 'lucide-react';
import api from '../api/axios';
import { useSchoolProfile } from '../context/SchoolProfileContext';

const LANGKAH = [
  { icon: UserPlus, judul: 'Masuk & Lengkapi Biodata', desc: 'Alumni masuk memakai akun siswa lama, lalu lengkapi biodata diri, KTP, dan CV di menu Biodata.' },
  { icon: Search, judul: 'Jelajahi Lowongan', desc: 'Cari lowongan dari mitra industri sekolah sesuai jurusan dan minat.' },
  { icon: Send, judul: 'Ajukan Lamaran', desc: 'Lamar langsung lewat sistem — data & dokumen otomatis terkirim ke perusahaan.' },
  { icon: CheckCircle2, judul: 'Terhubung dengan Perusahaan', desc: 'Perusahaan meninjau lamaran & menghubungi kandidat yang cocok.' },
];

/**
 * Halaman publik /bursakerjakhusus — papan loker BKK, TIDAK butuh login,
 * bisa dibagikan bebas. Cuma menampilkan lowongan berstatus "dibuka"
 * (sudah diverifikasi Waka Humas). Pola sama seperti PpdbPublic.jsx.
 * Gaya visual: minimal modern dengan SATU warna aksen (brand hijau) dipakai
 * percaya diri di titik-titik kunci — bukan monokrom polos, tapi juga
 * bukan banyak blok warna solid berbeda-beda. Sudut kartu/tombol rounded
 * sedang (bukan pill penuh) + shadow tipis, honey dipakai sebagai aksen
 * hangat cuma di tombol "Cari".
 */
export default function LowonganPublic() {
  const { profile } = useSchoolProfile();
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [jurusanId, setJurusanId] = useState(null);

  const load = (query, jid) => {
    setLoading(true);
    const params = {};
    if (query) params.q = query;
    if (jid) params.jurusan_id = jid;
    api.get('/lowongan', { params }).then((res) => setList(res.data.data || res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load('', null);
    api.get('/lowongan-stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(q, jurusanId);
  };

  const handleJurusan = (jid) => {
    const next = jurusanId === jid ? null : jid;
    setJurusanId(next);
    load(q, next);
  };

  const jurusanChips = useMemo(() => {
    const map = new Map();
    list.forEach((d) => { if (d.jurusan) map.set(d.jurusan.id, d.jurusan.nama); });
    return Array.from(map, ([id, nama]) => ({ id, nama })).slice(0, 6);
  }, [list]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
        <Link to="/bursakerjakhusus" className="flex items-center gap-2 font-display font-semibold text-ink-900 text-sm">
          {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-7 h-7 object-contain" />}
          {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}
        </Link>
        <Link to="/login" className="flex items-center justify-center min-h-11 text-sm font-medium text-ink-700 hover:text-brand-600 transition px-3 focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-lg">Masuk</Link>
      </div>

      {/* Hero — putih, satu aksen warna dipakai berani di badge + CTA */}
      <div className="max-w-4xl mx-auto px-5 pt-8 pb-16 sm:pt-12 sm:pb-24">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Bursa Kerja Khusus
        </span>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold text-ink-900 mb-5 text-balance max-w-2xl leading-[1.05]">
          Temukan langkah kerja <span className="text-brand-600">pertamamu</span>
        </h1>
        <p className="text-base sm:text-lg text-ink-500 max-w-md mb-10">
          Lowongan dari mitra industri {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}, khusus untuk siswa dan alumni.
        </p>

        <form onSubmit={handleSearch} className="max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Cari posisi, mis. "Teknisi Jaringan"'
            className="w-full rounded-xl border border-line-200 bg-white pl-11 pr-24 py-3.5 text-sm shadow-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition"
          />
          <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-honey-300 hover:bg-honey-400 transition text-ink-900 text-xs font-semibold px-4 focus-visible:outline-2 focus-visible:outline-honey-600 focus-visible:outline-offset-2">
            Cari
          </button>
        </form>

        {jurusanChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="text-xs text-ink-400 mr-1">Populer:</span>
            {jurusanChips.map((j) => (
              <button
                key={j.id}
                onClick={() => handleJurusan(j.id)}
                className={`min-h-9 text-xs font-medium rounded-lg px-3.5 py-1.5 transition focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 ${jurusanId === j.id ? 'bg-brand-100 text-brand-700' : 'bg-mist-50 text-ink-600 hover:bg-mist-100'}`}
              >
                {j.nama}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Statistik — angka besar polos, satu warna aksen */}
      {stats && (
        <div className="border-y border-line-200">
          <div className="max-w-4xl mx-auto px-5 grid grid-cols-3 divide-x divide-line-200">
            {[
              { label: 'Loker Aktif', value: stats.lowongan_aktif },
              { label: 'Mitra Industri', value: stats.mitra_industri },
              { label: 'Alumni Tersalurkan', value: stats.alumni_tersalurkan },
            ].map((s) => (
              <div key={s.label} className="py-7 sm:py-9 text-center">
                <p className="font-display text-3xl sm:text-4xl font-bold text-brand-500">{s.value}</p>
                <p className="text-xs text-ink-400 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alur sistem */}
      <div className="max-w-4xl mx-auto px-5 py-16 sm:py-24">
        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-12">Bagaimana alurnya</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {LANGKAH.map((l, i) => (
            <div key={l.judul}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <l.icon className="w-4 h-4 text-brand-600" />
                </div>
                <div className="h-px flex-1 bg-line-200" />
                <span className="text-xs font-mono text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="font-display font-medium text-sm text-ink-900 mb-1.5">{l.judul}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Loker terbaru */}
      <div className="border-t border-line-200 bg-mist-50">
        <div className="max-w-4xl mx-auto px-5 py-16 sm:py-24">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">Loker terbaru</h2>
          <p className="text-sm text-ink-500 mb-12">Lowongan yang sedang dibuka mitra industri</p>

          {loading ? (
            <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
          ) : list.length === 0 ? (
            <div className="text-center text-ink-300 text-sm py-10 bg-white rounded-xl shadow-sm">Belum ada lowongan yang tayang saat ini.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((d) => (
                <Link
                  key={d.id}
                  to={`/bursakerjakhusus/${d.id}`}
                  className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2"
                >
                  <div className="aspect-[16/9] bg-mist-100 flex items-center justify-center overflow-hidden">
                    {d.foto_brosur_url ? (
                      <img src={d.foto_brosur_url} alt={d.posisi} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-7 h-7 text-ink-300" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    {d.jurusan ? (
                      <span className="badge-soft badge-brand mb-1.5 inline-block w-fit">{d.jurusan.nama}</span>
                    ) : (
                      <span className="badge-soft mb-1.5 inline-block w-fit">Semua Jurusan</span>
                    )}
                    <h3 className="font-display font-semibold text-ink-900 group-hover:text-brand-600 transition">{d.posisi}</h3>
                    <p className="text-xs text-ink-500 flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {d.iduka?.nama_perusahaan}
                    </p>
                    {d.gaji && (
                      <p className="text-sm text-ink-900 font-semibold flex items-center gap-1 mt-1.5">
                        <Wallet className="w-3.5 h-3.5 text-ink-400" /> {d.gaji}
                      </p>
                    )}
                    <span className="mt-auto pt-3 text-xs font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                      Lihat detail <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ajakan bergabung */}
      <div className="max-w-4xl mx-auto px-5 py-16 sm:py-24">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
          <div>
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <UserPlus className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-display font-semibold text-ink-900 mb-1.5">Alumni &amp; siswa</h3>
            <p className="text-sm text-ink-500 mb-4">Masuk pakai akun siswa untuk melihat &amp; melamar lowongan yang tersedia.</p>
            <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition inline-flex items-center gap-1">
              Masuk sekarang <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-honey-100 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-honey-700" />
            </div>
            <h3 className="font-display font-semibold text-ink-900 mb-1.5">Perusahaan mitra</h3>
            <p className="text-sm text-ink-500 mb-4">
              Ingin memasang lowongan untuk lulusan {profile?.nama_sekolah || 'sekolah kami'}? Hubungi tim BKK sekolah.
            </p>
            {profile?.alamat && <p className="text-xs text-ink-400 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {profile.alamat}</p>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line-200">
        <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-display font-medium text-ink-900">
            {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-6 h-6 object-contain" />}
            {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}
          </div>
          <p className="text-xs text-ink-400">&copy; {new Date().getFullYear()} Bursa Kerja Khusus &middot; {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}</p>
        </div>
      </div>
    </div>
  );
}
