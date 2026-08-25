import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import PrintKembaliButton from '../../components/PrintKembaliButton';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import { fmtDMY } from '../../utils/date';

/**
 * Surat Rekomendasi BKK — dicetak Pengurus BKK dari menu Cetak Dokumen
 * (CetakDokumenTab.jsx), untuk 1 alumni. Kalau alumni sudah punya lamaran
 * berstatus "diterima" di sistem ini, nama perusahaan & posisinya otomatis
 * dicantumkan; kalau belum, jadi surat rekomendasi umum.
 */
export default function PrintSuratRekomendasi() {
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

  const diterima = data.job_applications?.find((a) => a.status === 'diterima');
  const hariIni = new Date();
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white text-ink-900">
      <div className="no-print flex justify-end items-center mb-6 gap-2">
        <PrintKembaliButton />
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="flex items-center gap-4 border-b-4 border-ink-900 pb-3 mb-6">
        {profile?.logo_url && <img src={profile.logo_url} alt="Logo" className="w-16 h-16 object-contain" />}
        <div>
          <p className="font-bold text-lg leading-tight">{profile?.nama_sekolah?.toUpperCase()}</p>
          <p className="text-xs">Bursa Kerja Khusus (BKK)</p>
          {profile?.alamat && <p className="text-xs">{profile.alamat}</p>}
        </div>
      </div>

      <h1 className="text-center font-bold text-lg underline mb-1">SURAT REKOMENDASI</h1>
      <p className="text-center text-sm mb-6">Nomor: .................................</p>

      <p className="text-sm mb-4">Yang bertanda tangan di bawah ini, Kepala {profile?.nama_sekolah}, dengan ini merekomendasikan:</p>

      <table className="text-sm mb-4">
        <tbody>
          <tr><td className="pr-3 py-0.5 align-top w-40">Nama</td><td className="pr-2 py-0.5 align-top">:</td><td className="py-0.5 font-medium">{data.user?.name}</td></tr>
          <tr><td className="pr-3 py-0.5 align-top">NISN</td><td className="pr-2 py-0.5 align-top">:</td><td className="py-0.5">{data.nisn || '-'}</td></tr>
          <tr><td className="pr-3 py-0.5 align-top">Kompetensi Keahlian</td><td className="pr-2 py-0.5 align-top">:</td><td className="py-0.5">{data.jurusan?.nama || '-'}</td></tr>
          <tr><td className="pr-3 py-0.5 align-top">Tanggal Lulus</td><td className="pr-2 py-0.5 align-top">:</td><td className="py-0.5">{fmtDMY(data.tanggal_lulus)}</td></tr>
        </tbody>
      </table>

      <p className="text-sm mb-4 text-justify">
        Adalah benar alumni {profile?.nama_sekolah} yang telah menyelesaikan pendidikan dengan baik dan tercatat aktif dalam program Bursa Kerja Khusus (BKK) sekolah.
        {diterima ? (
          <> Yang bersangkutan telah diterima bekerja di <b>{diterima.job_vacancy?.iduka?.nama_perusahaan}</b> untuk posisi <b>{diterima.job_vacancy?.posisi}</b>.</>
        ) : (
          <> Yang bersangkutan sedang dalam proses pencarian kerja dan direkomendasikan untuk dipertimbangkan mengisi lowongan kerja yang tersedia.</>
        )}
      </p>

      <p className="text-sm mb-8 text-justify">Demikian surat rekomendasi ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>

      <div className="flex justify-end">
        <div className="text-sm text-center w-64">
          <p>Sampit, {hariIni.getDate()} {namaBulan[hariIni.getMonth()]} {hariIni.getFullYear()}</p>
          <p>Kepala Sekolah,</p>
          <div className="h-24 flex items-center justify-center relative">
            {profile?.cap_sekolah_url && <img src={profile.cap_sekolah_url} alt="" className="absolute w-20 h-20 object-contain opacity-80 left-2" />}
            {profile?.ttd_kepala_sekolah_url && <img src={profile.ttd_kepala_sekolah_url} alt="" className="relative h-16 object-contain" />}
          </div>
          <p className="font-medium underline">{profile?.nama_kepala_sekolah || '.................................'}</p>
          {profile?.nip_kepala_sekolah && <p>NIP. {profile.nip_kepala_sekolah}</p>}
        </div>
      </div>

      <style>{`
        @media print { .no-print { display: none !important; } }
        @page { size: portrait; margin: 20mm; }
      `}</style>
    </div>
  );
}
