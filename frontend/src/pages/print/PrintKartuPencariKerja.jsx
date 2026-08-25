import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import { fmtDMY } from '../../utils/date';

const STATUS_LABEL = {
  bekerja: 'Bekerja',
  melanjutkan_kuliah: 'Melanjutkan Kuliah',
  wirausaha: 'Wirausaha',
  mencari_kerja: 'Mencari Kerja',
};

/**
 * Kartu Pencari Kerja — kartu identitas alumni sebagai pencari kerja
 * binaan BKK sekolah, dicetak dari menu Cetak Dokumen (CetakDokumenTab.jsx).
 */
export default function PrintKartuPencariKerja() {
  const { profile } = useSchoolProfile();
  const [params] = useSearchParams();
  const studentId = params.get('student_id');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) { setError('Parameter student_id tidak ada.'); return; }
    api.get(`/bkk/alumni/${studentId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [studentId]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!data) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  return (
    <div className="p-8 max-w-lg mx-auto bg-mist-50">
      <div className="no-print flex justify-end items-center mb-6 gap-2">
        <PrintKembaliButton />
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border-2 border-ink-900">
        <div className="bg-[#0B1B3A] px-5 py-4 flex items-center gap-3">
          {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-10 h-10 object-contain" />}
          <div className="text-white">
            <p className="font-bold text-sm leading-tight">{profile?.nama_sekolah?.toUpperCase()}</p>
            <p className="text-[10px] text-white/70">Kartu Pencari Kerja &mdash; Bursa Kerja Khusus</p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex gap-4">
            <div className="w-24 h-32 bg-mist-100 border border-line-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-ink-300 text-xs">
              {data.foto_url ? <img src={data.foto_url} alt="" className="w-full h-full object-cover" /> : 'Foto'}
            </div>
            <table className="text-sm">
              <tbody>
                <tr><td className="pr-2 py-0.5 align-top text-ink-500">Nama</td><td className="py-0.5 font-semibold">{data.user?.name}</td></tr>
                <tr><td className="pr-2 py-0.5 align-top text-ink-500">NISN</td><td className="py-0.5">{data.nisn || '-'}</td></tr>
                <tr><td className="pr-2 py-0.5 align-top text-ink-500">Jurusan</td><td className="py-0.5">{data.jurusan?.nama || '-'}</td></tr>
                <tr><td className="pr-2 py-0.5 align-top text-ink-500">Lulus</td><td className="py-0.5">{fmtDMY(data.tanggal_lulus)}</td></tr>
                <tr><td className="pr-2 py-0.5 align-top text-ink-500">Status</td><td className="py-0.5">{data.tracer_study ? STATUS_LABEL[data.tracer_study.status_saat_ini] : 'Mencari Kerja'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-line-300 flex items-center justify-between">
            <div className="text-xs text-ink-500">
              <p>Berlaku sebagai bukti terdaftar</p>
              <p>sebagai pencari kerja binaan BKK sekolah.</p>
            </div>
            {profile?.cap_sekolah_url && <img src={profile.cap_sekolah_url} alt="" className="w-16 h-16 object-contain opacity-80" />}
          </div>
        </div>
      </div>

      <style>{`
        @media print { .no-print { display: none !important; } }
        @page { size: portrait; margin: 15mm; }
      `}</style>
    </div>
  );
}
