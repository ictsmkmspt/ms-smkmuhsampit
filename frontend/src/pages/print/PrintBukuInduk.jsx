import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, User } from 'lucide-react';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

const JK_LABEL = { L: 'Laki-laki', P: 'Perempuan' };

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatTanggal = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};

// Halaman "Buku Induk" siswa — detail biodata 1 siswa, dibuka lewat menu
// BARU (window.open, lihat tombol Detail di StudentsTab.jsx), BUKAN
// modal/popup di dalam dashboard, supaya bisa dicetak/disimpan sendiri
// seperti dokumen buku induk sekolah pada umumnya. Foto siswa + pengesahan
// kepala sekolah (cap+ttd+nama+NIP) sengaja diletakkan berdampingan di
// bagian bawah, meniru tata letak dokumen resmi sekolah.
export default function PrintBukuInduk() {
  const { id } = useParams();
  const { profile } = useSchoolProfile();
  const [siswa, setSiswa] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/students/${id}`)
      .then((res) => setSiswa(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data siswa.'));
  }, [id]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!siswa) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  return (
    <div className="p-6 bg-mist-50 min-h-screen">
      <div className="no-print flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <h1 className="font-display text-lg font-semibold text-ink-900">Buku Induk — {siswa.user?.name}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="lembar max-w-3xl mx-auto bg-white">
        <div className="lembar-header">
          {profile?.logo_url && <img src={profile.logo_url} alt="" className="lembar-logo" />}
          <div>
            <p className="lembar-sekolah">{profile?.nama_sekolah}</p>
            <p className="lembar-judul">BUKU INDUK SISWA</p>
          </div>
        </div>

        <div className="lembar-body">
          <table className="lembar-tabel lembar-tabel-full">
            <tbody>
              <tr><td className="lembar-label">Nama Lengkap</td><td>{siswa.user?.name}</td></tr>
              <tr><td className="lembar-label">NISN</td><td className="font-mono">{siswa.nisn || '-'}</td></tr>
              <tr><td className="lembar-label">NIS</td><td className="font-mono">{siswa.nis || '-'}</td></tr>
              <tr><td className="lembar-label">Jenis Kelamin</td><td>{JK_LABEL[siswa.jenis_kelamin] || '-'}</td></tr>
              <tr><td className="lembar-label">Tempat, Tanggal Lahir</td><td>{[siswa.tempat_lahir, formatTanggal(siswa.tanggal_lahir)].filter(Boolean).join(', ') || '-'}</td></tr>
              <tr><td className="lembar-label">Alamat</td><td>{siswa.alamat || '-'}</td></tr>
              <tr><td className="lembar-label">Jurusan</td><td>{siswa.jurusan?.nama || '-'}</td></tr>
              <tr><td className="lembar-label">Email</td><td>{siswa.user?.email || '-'}</td></tr>
            </tbody>
          </table>

          <div className="lembar-bawah">
            <div className="lembar-foto">
              {siswa.foto_url ? (
                <div className="lembar-foto-img" style={{ backgroundImage: `url(${siswa.foto_url})` }} />
              ) : (
                <User className="w-10 h-10 text-ink-300" />
              )}
            </div>

            <div className="lembar-pengesahan">
              <p className="lembar-pengesahan-label">Mengetahui,<br />Kepala Sekolah</p>
              <div className="lembar-ttd-gambar">
                {profile?.cap_sekolah_url && <img src={profile.cap_sekolah_url} alt="" className="lembar-cap-img" />}
                {profile?.ttd_kepala_sekolah_url && <img src={profile.ttd_kepala_sekolah_url} alt="" className="lembar-ttd-img" />}
              </div>
              <p className="lembar-pengesahan-nama">{profile?.nama_kepala_sekolah || '-'}</p>
              {profile?.nip_kepala_sekolah && <p className="lembar-pengesahan-nip">NIP. {profile.nip_kepala_sekolah}</p>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lembar {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
        }
        .lembar-header {
          background: #0B1B3A;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lembar-logo { width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 6px; padding: 3px; }
        .lembar-sekolah { color: #fff; font-size: 13px; font-weight: 700; }
        .lembar-judul { color: #F2B705; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; margin-top: 2px; }
        .lembar-body { padding: 24px; }
        .lembar-tabel { width: 100%; font-size: 13px; border-collapse: collapse; }
        .lembar-tabel td, .lembar-tabel th { padding: 5px 8px; text-align: left; vertical-align: top; }
        .lembar-tabel-full { margin-bottom: 28px; }
        .lembar-tabel-full td { border-bottom: 1px solid #F1F5F9; }
        .lembar-label { color: #64748b; font-weight: 600; width: 40%; }

        .lembar-bawah { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
        .lembar-foto {
          width: 30mm; height: 40mm; flex-shrink: 0;
          border-radius: 6px; border: 1px solid #E2E8F0; background: #F1F5F9;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .lembar-foto-img { width: 100%; height: 100%; background-size: cover; background-position: center; }

        .lembar-pengesahan { text-align: center; width: 46mm; }
        .lembar-pengesahan-label { font-size: 12px; color: #334155; line-height: 1.4; }
        .lembar-ttd-gambar { position: relative; width: 100%; height: 22mm; margin: 4px 0; }
        .lembar-cap-img { position: absolute; top: 0; left: 2mm; width: 18mm; height: 18mm; object-fit: contain; opacity: 0.85; }
        .lembar-ttd-img { position: absolute; top: 0; right: 2mm; width: 20mm; height: 18mm; object-fit: contain; }
        .lembar-pengesahan-nama { font-size: 13px; font-weight: 700; color: #0f172a; text-decoration: underline; }
        .lembar-pengesahan-nip { font-size: 11px; color: #64748b; margin-top: 2px; }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .lembar { border: none; }
          .lembar, .lembar * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4 portrait; margin: 14mm; }
      `}</style>
    </div>
  );
}
