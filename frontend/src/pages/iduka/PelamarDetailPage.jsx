import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, UserRound, FileText, IdCard, Award, Building2, X } from 'lucide-react';
import api from '../../api/axios';
import { fmtDMY } from '../../utils/date';

const STATUS_BADGE = {
  diajukan: { label: 'Diajukan', className: 'badge-honey' },
  diterima: { label: 'Diterima', className: 'badge-brand' },
  ditolak: { label: 'Ditolak', className: 'badge-rose' },
};

const STATUS_PERNIKAHAN_LABEL = { belum_menikah: 'Belum Menikah', menikah: 'Menikah' };

function Baris({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line-200 last:border-0">
      <dt className="text-ink-500 text-sm">{label}</dt>
      <dd className="text-ink-900 text-sm font-medium text-right">{children ?? '-'}</dd>
    </div>
  );
}

/**
 * Biodata lengkap 1 pelamar — dibuka TAB BARU (bukan popup) dari tombol
 * "Detail" di PelamarModal (LowonganTab.jsx), supaya IDUKA gampang baca
 * biodata alumni tanpa terbatas ruang popup. Halaman penuh, bukan modal —
 * pola sama seperti EditBiodataSiswaPage.jsx.
 */
export default function PelamarDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [zoomFoto, setZoomFoto] = useState(false);

  useEffect(() => {
    api.get(`/iduka/lamaran/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data pelamar.'));
  }, [id]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!data) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const s = data.student;
  const badge = STATUS_BADGE[data.status];

  return (
    <div className="min-h-screen bg-mist-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => window.close()} className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft className="w-4 h-4" /> Tutup
          </button>
          <span className={`badge-soft ${badge.className}`}>{badge.label}</span>
        </div>

        <div className="surface-card p-5 flex items-center gap-4">
          {s.foto_url ? (
            <button type="button" onClick={() => setZoomFoto(true)} className="w-16 h-16 rounded-full overflow-hidden shrink-0 cursor-zoom-in" title="Perbesar foto">
              <img src={s.foto_url} alt="" className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full bg-mist-50 flex items-center justify-center shrink-0">
              <UserRound className="w-7 h-7 text-ink-300" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-semibold text-ink-900 text-lg truncate">{s.user?.name}</h1>
            <p className="text-sm text-ink-500">{s.jurusan?.nama || '-'} &middot; {s.class_room?.name || 'Alumni'}</p>
            <p className="text-xs text-ink-400 flex items-center gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5" /> Melamar {data.job_vacancy?.posisi} &middot; {fmtDMY(data.created_at)}
            </p>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-sm text-ink-900 mb-2">Data Diri</h2>
          <dl>
            <Baris label="NIK">{s.nik}</Baris>
            <Baris label="Jenis Kelamin">{s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</Baris>
            <Baris label="Tempat, Tanggal Lahir">{s.tempat_lahir && s.tanggal_lahir ? `${s.tempat_lahir}, ${fmtDMY(s.tanggal_lahir)}` : '-'}</Baris>
            <Baris label="Alamat">{s.alamat}</Baris>
            <Baris label="No. HP">{s.no_telp}</Baris>
            <Baris label="Agama">{s.agama}</Baris>
            <Baris label="Status Pernikahan">{STATUS_PERNIKAHAN_LABEL[s.status_pernikahan]}</Baris>
            <Baris label="Tinggi / Berat Badan">{s.tinggi_badan && s.berat_badan ? `${s.tinggi_badan} cm / ${s.berat_badan} kg` : '-'}</Baris>
          </dl>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-sm text-ink-900 mb-2">Keahlian &amp; Pengalaman</h2>
          {s.keahlian?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {s.keahlian.map((k) => <span key={k} className="badge-soft badge-brand">{k}</span>)}
            </div>
          ) : (
            <p className="text-sm text-ink-300 mb-3">Belum ada keahlian yang diisi.</p>
          )}
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Pengalaman Kerja</p>
          <p className="text-sm text-ink-700 whitespace-pre-line">{s.pengalaman_kerja || 'Belum ada pengalaman kerja.'}</p>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">Dokumen</h2>
          <div className="space-y-2">
            {s.ktp_url && (
              <a href={s.ktp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 border border-line-200 rounded-lg px-3 py-2">
                <IdCard className="w-4 h-4 shrink-0" /> Lihat KTP
              </a>
            )}
            {s.cv_url && (
              <a href={s.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 border border-line-200 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 shrink-0" /> Lihat CV
              </a>
            )}
            {s.sertifikat_list?.map((sert) => (
              <a key={sert.id} href={sert.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 border border-line-200 rounded-lg px-3 py-2">
                <Award className="w-4 h-4 shrink-0" /> {sert.nama}
              </a>
            ))}
            {!s.ktp_url && !s.cv_url && !s.sertifikat_list?.length && (
              <p className="text-sm text-ink-300">Belum ada dokumen yang diunggah.</p>
            )}
          </div>
        </div>
      </div>

      {zoomFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setZoomFoto(false)}>
          <div className="absolute inset-0 bg-ink-900/70" />
          <div className="relative max-w-md w-full">
            <button onClick={() => setZoomFoto(false)} className="absolute -top-10 right-0 text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={s.foto_url} alt={s.user?.name} className="w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
