import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function PrintPklJurnalKegiatan() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const placementId = params.get('placement_id');

  const now = new Date();
  const [bulanPilih, setBulanPilih] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const [placement, setPlacement] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!placementId) {
      setError('Parameter placement_id tidak ada.');
      return;
    }

    const jurnalReq = user.role === 'siswa'
      ? api.get('/my-pkl-jurnal')
      : api.get(`/pkl-placements/${placementId}/jurnal`);

    Promise.all([
      api.get(`/pkl-placements/${placementId}`),
      jurnalReq,
    ])
      .then(([p, j]) => {
        setPlacement(p.data);
        setEntries(j.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data.'));
  }, [placementId]); // eslint-disable-line

  const [tahun, bulan] = bulanPilih.split('-').map(Number);

  const rows = useMemo(() => {
    return entries
      .filter((e) => e.date?.startsWith(bulanPilih))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e, i) => {
        const d = new Date(e.date);
        return { no: i + 1, namaHari: HARI[d.getDay()], tanggal: d.getDate(), ...e };
      });
  }, [entries, bulanPilih]);

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!placement) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-ink-900">
      <div className="no-print flex justify-between items-center mb-6">
        <select value={bulanPilih} onChange={(e) => setBulanPilih(e.target.value)} className="field-input text-sm">
          {Array.from({ length: 12 }, (_, i) => {
            const y = now.getFullYear();
            const m = i + 1;
            const val = `${y}-${String(m).padStart(2, '0')}`;
            return <option key={val} value={val}>{BULAN[i]} {y}</option>;
          })}
        </select>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="mb-6 text-sm">
        <p className="font-bold flex items-center gap-1.5">
          <span>◆</span> SMK MUHAMMADIYAH SAMPIT
        </p>
        <p className="font-bold text-xs ml-4">JURNAL PRAKTIK KERJA LAPANGAN {tahun}</p>
      </div>

      <h1 className="text-center font-bold text-lg mb-6">JURNAL KEGIATAN PKL</h1>

      <table className="text-sm mb-6">
        <tbody>
          <tr>
            <td className="pr-3 py-0.5 align-top w-48">Nama Peseta PKL</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.student?.user?.name}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Nama Iduka Tempat PKL</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.dudi?.nama_perusahaan}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Nama Instruktur</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.dudi?.penanggung_jawab || '-'}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Nama Guru Pembimbing</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{placement.guru_pembimbing?.user?.name || '-'}</td>
          </tr>
          <tr>
            <td className="pr-3 py-0.5 align-top">Bulan</td>
            <td className="pr-2 py-0.5 align-top">:</td>
            <td className="py-0.5">{BULAN[bulan - 1]} {tahun}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-ink-400 px-2 py-2 w-10">No</th>
            <th className="border border-ink-400 px-2 py-2 w-28">Hari, tanggal</th>
            <th className="border border-ink-400 px-2 py-2">Kegiatan</th>
            <th className="border border-ink-400 px-2 py-2 w-40">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="border border-ink-400 px-2 py-2 text-center">{r.no}</td>
              <td className="border border-ink-400 px-2 py-2">{r.namaHari}, {r.tanggal}</td>
              <td className="border border-ink-400 px-2 py-2 whitespace-pre-wrap">{r.kegiatan}</td>
              <td className="border border-ink-400 px-2 py-2 whitespace-pre-wrap">{r.catatan || ''}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan="4" className="border border-ink-400 px-2 py-6 text-center text-ink-400">Belum ada kegiatan yang diisi untuk bulan ini.</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-between mt-16 text-sm">
        <div>
          <p className="invisible">Sampit, ..................................</p>
          <p>Guru Pembimbing,</p>
          <div className="h-16" />
          <p>.....................................</p>
        </div>
        <div className="text-right">
          <p>Sampit, ..................................</p>
          <p>Instruktur Dunia Kerja,</p>
          <div className="h-16" />
          <p>.....................................</p>
        </div>
      </div>

      <div className="mt-8 text-xs">
        <p className="font-medium mb-1">Format Jurnal Kegiatan PKL</p>
        <ol className="list-[lower-alpha] list-inside space-y-0.5">
          <li>Kolom 1 diisi dengan nomor urut</li>
          <li>Kolom 2 diisi dengan Hari dan tanggal kegiatan.</li>
          <li>Kolom 3 diisi dengan jenis kegiatan/pekerjaan atau keterampilan yang dilakukan murid.</li>
          <li>Kolom 4 diisi oleh Instruktur Dunia Kerja pada setiap kegiatan atau waktu tertentu.</li>
          <li>Jurnal diisi setiap hari, setiap bulan jurnal ditandatangani Guru Pembimbing dan Instruktur Dunia Kerja</li>
        </ol>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: portrait; margin: 15mm 15mm 15mm 25mm; }
      `}</style>
    </div>
  );
}
