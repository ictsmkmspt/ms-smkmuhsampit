import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Wallet, GraduationCap, Users, MapPin, CalendarClock, Phone, Mail } from 'lucide-react';
import api from '../api/axios';
import { useSchoolProfile } from '../context/SchoolProfileContext';
import { fmtDMY } from '../utils/date';

/**
 * Detail publik 1 lowongan (/bursakerjakhusus/:id) — bisa dibagikan bebas
 * ke luar. Tombol "Lamar" mengarahkan ke login (alumni harus login sebagai
 * siswa dulu buat melamar, lihat LokerTab.jsx di dashboard Siswa).
 * Gaya visual senada dengan LowonganPublic.jsx: minimal modern, satu warna
 * aksen (brand hijau), sudut rounded sedang + shadow tipis di kartu.
 */
export default function LowonganDetailPublic() {
  const { profile } = useSchoolProfile();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/lowongan/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Link to="/bursakerjakhusus" className="flex items-center gap-2 font-display font-semibold text-ink-900 text-sm">
            {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-7 h-7 object-contain" />}
            {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}
          </Link>
          <Link to="/bursakerjakhusus/masuk" className="flex items-center justify-center min-h-11 text-sm font-medium text-ink-700 hover:text-brand-600 transition px-3 focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-lg">Masuk</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-2 pb-8">
        <Link to="/bursakerjakhusus" className="flex items-center gap-1.5 min-h-11 -ml-1 pl-1 pr-3 text-sm text-ink-500 hover:text-brand-600 mb-6 transition w-fit focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" /> Semua Lowongan
        </Link>

        {notFound ? (
          <div className="text-center text-ink-300 text-sm py-16 border-t border-line-200">Lowongan tidak ditemukan.</div>
        ) : !data ? (
          <p className="text-center text-ink-300 text-sm py-16">Memuat...</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-8 items-start">
            <div className="sm:col-span-2">
              <div className="bg-mist-50 rounded-xl flex items-center justify-center overflow-hidden mb-6 max-h-[420px]">
                {data.foto_brosur_url ? (
                  <img src={data.foto_brosur_url} alt={data.posisi} className="w-full h-full max-h-[420px] object-contain" />
                ) : (
                  <div className="aspect-[16/8] w-full flex items-center justify-center">
                    <Building2 className="w-9 h-9 text-ink-300" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {data.jurusan ? (
                  <span className="badge-soft badge-brand">{data.jurusan.nama}</span>
                ) : (
                  <span className="badge-soft">Semua Jurusan</span>
                )}
                {data.status === 'ditutup' && <span className="badge-soft badge-rose">Sudah Ditutup</span>}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 mb-2 leading-tight">{data.posisi}</h1>
              <p className="text-sm text-ink-500 flex items-center gap-1.5 mb-8">
                <Building2 className="w-4 h-4 shrink-0" /> {data.nama_perusahaan_tampil}{data.alamat_tampil ? ` · ${data.alamat_tampil}` : ''}
              </p>

              <div className="border-t border-line-200 pt-6 mb-6">
                <h2 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">Deskripsi Pekerjaan</h2>
                <p className="text-sm text-ink-700 whitespace-pre-line leading-relaxed">{data.deskripsi}</p>
              </div>

              {data.kualifikasi && (
                <div className="border-t border-line-200 pt-6">
                  <h2 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">Kualifikasi</h2>
                  <p className="text-sm text-ink-700 whitespace-pre-line leading-relaxed">{data.kualifikasi}</p>
                </div>
              )}
            </div>

            <div className="sm:sticky sm:top-8 bg-mist-50 rounded-xl p-5 shadow-sm space-y-5">
              <div className="space-y-4 text-sm text-ink-700">
                {data.gaji && (
                  <div className="flex items-start gap-2.5">
                    <Wallet className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide">Gaji</p>
                      <p className="font-medium text-brand-700">{data.gaji}</p>
                    </div>
                  </div>
                )}
                {data.jurusan && (
                  <div className="flex items-start gap-2.5">
                    <GraduationCap className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide">Jurusan</p>
                      <p className="font-medium">{data.jurusan.nama}</p>
                    </div>
                  </div>
                )}
                {data.kuota && (
                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide">Kuota</p>
                      <p className="font-medium">{data.kuota} orang</p>
                    </div>
                  </div>
                )}
                {data.tanggal_tutup && (
                  <div className="flex items-start gap-2.5">
                    <CalendarClock className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide">Batas Lamar</p>
                      <p className="font-medium">{fmtDMY(data.tanggal_tutup)}</p>
                    </div>
                  </div>
                )}
                {data.alamat_tampil && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-400 uppercase tracking-wide">Lokasi</p>
                      <p className="font-medium">{data.alamat_tampil}</p>
                    </div>
                  </div>
                )}
              </div>

              {data.status !== 'dibuka' ? (
                <button disabled className="btn-primary w-full justify-center opacity-50">Tidak Menerima Lamaran</button>
              ) : data.sumber === 'bkk' ? (
                <div className="space-y-2">
                  {data.telepon_tampil && (
                    <a href={`tel:${data.telepon_tampil}`} className="btn-primary w-full justify-center gap-2">
                      <Phone className="w-4 h-4" /> {data.telepon_tampil}
                    </a>
                  )}
                  {data.email_tampil && (
                    <a href={`mailto:${data.email_tampil}`} className="btn-primary w-full justify-center gap-2">
                      <Mail className="w-4 h-4" /> {data.email_tampil}
                    </a>
                  )}
                  {!data.telepon_tampil && !data.email_tampil && (
                    <p className="text-sm text-ink-400 text-center">Kontak perusahaan belum tersedia.</p>
                  )}
                </div>
              ) : (
                <Link to="/bursakerjakhusus/masuk" className="btn-primary w-full justify-center">Masuk untuk Melamar</Link>
              )}
              <p className="text-xs text-ink-400 text-center">
                {data.sumber === 'bkk'
                  ? 'Lowongan ini dipasang BKK — hubungi perusahaan langsung untuk melamar.'
                  : `Khusus alumni ${profile?.nama_sekolah || 'sekolah'} — masuk pakai akun siswa.`}
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
