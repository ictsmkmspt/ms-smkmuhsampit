import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer, User } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';

// 3 warna + teks sisi belakang (judul & ketentuan) sekarang dipusatkan
// lewat menu Pengaturan > Kartu Pelajar (bukan localStorage/hardcode lagi)
// — halaman ini cuma MEMBACA nilainya. Default dicocokkan dengan palet
// MaintenancePage (navy + emas) kalau pengaturannya belum pernah diisi.
const PENGATURAN_DEFAULT = {
  warna_utama: '#0B1B3A', warna_aksen: '#F2B705', warna_abu: '#94A3B8',
  judul_belakang: 'Ketentuan Kartu Pelajar',
  ketentuan: 'Kartu ini milik pribadi siswa yang bersangkutan.\nWajib dibawa selama berada di lingkungan sekolah.\nJika ditemukan, mohon dikembalikan ke pihak sekolah.',
};

const JK_LABEL = { L: 'Laki-laki', P: 'Perempuan' };

// Format tanggal panjang ("17 Mei 2009") — dokumen cetak resmi SENGAJA
// tidak pakai fmtDMY (format dd-mm-yyyy singkat) yang dipakai layar
// aplikasi biasa, lihat komentar di utils/date.js.
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatTanggal = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};

// Kartu pelajar POTRAIT (format CR80 kartu ID diputar tegak, 54mm x 86mm)
// gaya MINIMALIS (bukan lagi wave/curve) — header rata warna utama, kotak
// foto placeholder, baris info kelas, footer alamat+website sekolah + QR.
// 3 warna kartu bisa diedit lewat toolbar. QR di sisi depan pakai qr_code
// siswa yang sama dengan yang sudah bisa dipindai fitur scan yang ada
// (Kehadiran, Sholat Zuhur, Poin) — sengaja QR bukan gambar barcode statis
// supaya kartunya sungguh berfungsi.
export default function PrintKartuPelajar() {
  const { profile } = useSchoolProfile();
  const [params, setParams] = useSearchParams();
  const classRoomIdParam = params.get('class_room_id') || '';
  const studentIdParam = params.get('student_id') || '';

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState(null);
  const [qrMap, setQrMap] = useState({});
  const [error, setError] = useState('');
  const [sisi, setSisi] = useState('depan'); // 'depan' | 'belakang'
  const [warna, setWarna] = useState(PENGATURAN_DEFAULT);
  const [downloading, setDownloading] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/kartu-pelajar-pengaturan').then((res) => setWarna(res.data));
  }, []);

  useEffect(() => {
    setStudents(null);
    if (studentIdParam) {
      api.get(`/students/${studentIdParam}`)
        .then((res) => setStudents([res.data]))
        .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data siswa.'));
      return;
    }
    api.get('/students', { params: classRoomIdParam ? { class_room_id: classRoomIdParam } : {} })
      .then((res) => setStudents(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data siswa.'));
  }, [classRoomIdParam, studentIdParam]);

  useEffect(() => {
    if (!students) return;
    let batal = false;
    (async () => {
      const map = {};
      for (const s of students) {
        // Kontras hitam-putih murni (lepas dari warna kartu) supaya tetap
        // gampang dipindai kamera, tidak ikut warna kartu yang dipilih.
        map[s.id] = await QRCode.toDataURL(s.qr_code, { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
      }
      if (!batal) setQrMap(map);
    })();
    return () => { batal = true; };
  }, [students]);

  const ubahKelas = (e) => {
    const v = e.target.value;
    if (v) setParams({ class_room_id: v }); else setParams({});
  };

  // Render tiap elemen kartu (bukan seluruh halaman) jadi gambar PNG lewat
  // html2canvas — scale 3x supaya tetap tajam kalau nanti dicetak fisik.
  // Semua sumber gambar di kartu (logo/foto siswa lewat /storage yang
  // di-proxy 1 origin, QR lewat data-URI) sama-origin/data-URI, jadi tidak
  // kena masalah CORS/"tainted canvas". Kalau cuma 1 kartu, langsung unduh
  // PNG-nya; kalau lebih dari 1, dikumpulkan jadi satu file .zip (pola
  // sama seperti "Download Semua QR" di tab Siswa).
  const handleDownload = async () => {
    if (!gridRef.current) return;
    setDownloading(true);
    try {
      const nodes = [...gridRef.current.querySelectorAll('.kartu')];
      const hasil = [];
      for (let i = 0; i < nodes.length; i++) {
        const canvas = await html2canvas(nodes[i], { scale: 3, backgroundColor: '#ffffff' });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const s = students[i];
        const namaBersih = (s.user?.name || 'siswa').replace(/[^a-z0-9]+/gi, '_');
        hasil.push({ nama: `${s.nis || s.id}_${namaBersih}_${sisi}.png`, blob });
      }

      if (hasil.length === 1) {
        saveAs(hasil[0].blob, hasil[0].nama);
      } else {
        const zip = new JSZip();
        hasil.forEach((h) => zip.file(h.nama, h.blob));
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `kartu-pelajar-${sisi}-${hasil.length}.zip`);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal membuat gambar kartu pelajar.');
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!students) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const semuaQrSiap = students.length > 0 && Object.keys(qrMap).length >= students.length;
  const cssVars = { '--utama': warna.warna_utama, '--aksen': warna.warna_aksen, '--abu': warna.warna_abu };

  return (
    <div className="p-6 bg-mist-50 min-h-screen">
      <div className="no-print flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display text-lg font-semibold text-ink-900 mr-auto">
          {studentIdParam ? `Cetak Kartu Pelajar — ${students[0]?.user?.name || ''}` : `Cetak Kartu Pelajar (${students.length})`}
        </h1>

        <div className="flex bg-white border border-line-200 rounded-lg p-1">
          <button onClick={() => setSisi('depan')} className={`text-sm font-medium px-3 py-1.5 rounded-md transition ${sisi === 'depan' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-mist-50'}`}>Sisi Depan</button>
          <button onClick={() => setSisi('belakang')} className={`text-sm font-medium px-3 py-1.5 rounded-md transition ${sisi === 'belakang' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-mist-50'}`}>Sisi Belakang</button>
        </div>

        {!studentIdParam && (
          <select value={classRoomIdParam} onChange={ubahKelas} className="field-input text-ink-700 w-44">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <span className="text-xs text-ink-400">Warna diatur lewat menu Pengaturan &gt; Kartu Pelajar</span>

        <button
          onClick={() => window.print()}
          disabled={!semuaQrSiap}
          className="flex items-center gap-2 bg-white text-ink-700 border border-line-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-mist-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" /> Print Kartu Pelajar
        </button>

        <button
          onClick={handleDownload}
          disabled={!semuaQrSiap || downloading}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> {!semuaQrSiap ? 'Menyiapkan QR...' : downloading ? 'Membuat gambar...' : 'Download Kartu Pelajar'}
        </button>
      </div>

      {students.length === 0 && <p className="text-center text-ink-400">Tidak ada siswa untuk dicetak.</p>}

      <div className="kartu-grid" ref={gridRef}>
        {sisi === 'depan' ? students.map((s) => (
          <div key={s.id} className="kartu" style={cssVars}>
            <div className="kartu-header">
              <div className="kartu-avatar-mini">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="" className="kartu-avatar-img" />
                ) : (
                  profile?.nama_sekolah?.charAt(0)?.toUpperCase() || 'S'
                )}
              </div>
              <div className="kartu-header-text">
                <p className="kartu-sekolah">{profile?.nama_sekolah}</p>
                <p className="kartu-label-jenis">kartu pelajar</p>
              </div>
            </div>
            <div className="kartu-body">
              <div className="kartu-foto-placeholder">
                {s.foto_url ? (
                  // Dipakai sebagai background-image (bukan <img object-fit>)
                  // supaya potongan/rasio fotonya SAMA persis antara yang
                  // tampil di layar dan hasil download gambar — html2canvas
                  // tidak selalu merender object-fit:cover dengan akurat,
                  // tapi background-size:cover konsisten di keduanya.
                  <div className="kartu-foto-img" style={{ backgroundImage: `url(${s.foto_url})` }} />
                ) : (
                  <User className="kartu-foto-icon" />
                )}
              </div>
              <p className="kartu-nama">{s.user?.name}</p>
              <p className="kartu-nis">NIS {s.nis || '-'}</p>
              {s.jurusan?.nama && (
                <p className="kartu-nis">{s.jurusan.nama}</p>
              )}
              <div className="kartu-divider" />
              {(s.tempat_lahir || s.tanggal_lahir) && (
                <p className="kartu-ttl">{[s.tempat_lahir, formatTanggal(s.tanggal_lahir)].filter(Boolean).join(', ')}</p>
              )}
              {s.jenis_kelamin && (
                <p className="kartu-ttl">{JK_LABEL[s.jenis_kelamin]}</p>
              )}
              {s.alamat && (
                <p className="kartu-alamat">{s.alamat}</p>
              )}
            </div>
            <div className="kartu-footer">
              {qrMap[s.id] ? (
                <img src={qrMap[s.id]} alt={s.qr_code} className="kartu-qr-mini" />
              ) : (
                <div className="kartu-qr-mini kartu-qr-placeholder">...</div>
              )}
              <div className="kartu-ttd-blok">
                <p className="kartu-ttd-jabatan">Kepala Sekolah</p>
                <div className="kartu-ttd-gambar">
                  {profile?.cap_sekolah_url && <img src={profile.cap_sekolah_url} alt="" className="kartu-cap-img" />}
                  {profile?.ttd_kepala_sekolah_url && <img src={profile.ttd_kepala_sekolah_url} alt="" className="kartu-ttd-img" />}
                </div>
                {profile?.nama_kepala_sekolah && <p className="kartu-ttd-nama">{profile.nama_kepala_sekolah}</p>}
                {profile?.nip_kepala_sekolah && <p className="kartu-ttd-nip">NIP. {profile.nip_kepala_sekolah}</p>}
              </div>
            </div>
          </div>
        )) : students.map((s) => (
          <div key={s.id} className="kartu" style={cssVars}>
            <div className="kartu-header">
              <div className="kartu-avatar-mini">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="" className="kartu-avatar-img" />
                ) : (
                  profile?.nama_sekolah?.charAt(0)?.toUpperCase() || 'S'
                )}
              </div>
              <div className="kartu-header-text">
                <p className="kartu-sekolah">{profile?.nama_sekolah}</p>
                <p className="kartu-label-jenis">kartu pelajar</p>
              </div>
            </div>
            <div className="kartu-body kartu-body-belakang">
              <p className="kartu-ketentuan-judul">{warna.judul_belakang}</p>
              <div className="kartu-ketentuan-list">
                {(warna.ketentuan || '').split('\n').filter(Boolean).map((k, i) => (
                  <div key={i} className="kartu-ketentuan-item">
                    <span className="kartu-ketentuan-dot" />
                    <span>{k}</span>
                  </div>
                ))}
              </div>
              {qrMap[s.id] ? (
                <img src={qrMap[s.id]} alt={s.qr_code} className="kartu-qr-besar" />
              ) : (
                <div className="kartu-qr-besar kartu-qr-placeholder">...</div>
              )}
              <p className="kartu-qr-kode">{s.qr_code}</p>
            </div>
            <div className="kartu-footer">
              <div className="kartu-footer-text">
                <p className="kartu-footer-label">Berlaku selama bersekolah di</p>
                <p className="kartu-footer-sekolah">{profile?.nama_sekolah}</p>
              </div>
              <div className="kartu-footer-kanan">
                {profile?.alamat && <p className="kartu-footer-kontak">{profile.alamat}</p>}
                {profile?.website && <p className="kartu-footer-kontak">{profile.website}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .kartu-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4mm;
        }
        .kartu {
          position: relative;
          width: 54mm;
          height: 86mm;
          background: #ffffff;
          border: 0.3mm solid #E2E8F0;
          border-radius: 3mm;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .kartu-header {
          background: var(--utama);
          padding: 2.5mm 3mm;
          display: flex;
          align-items: center;
          gap: 2mm;
          flex-shrink: 0;
        }
        .kartu-avatar-mini {
          width: 10mm;
          height: 10mm;
          border-radius: 50%;
          background: var(--aksen);
          color: var(--utama);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
          overflow: hidden;
        }
        .kartu-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
          border-radius: 50%;
          padding: 0.8mm;
          box-sizing: border-box;
        }
        .kartu-header-text { min-width: 0; }
        .kartu-sekolah {
          color: #fff;
          font-size: 8.5px;
          font-weight: 700;
          line-height: 1.2;
        }
        .kartu-label-jenis {
          color: var(--aksen);
          font-size: 7.5px;
          font-weight: 600;
          margin-top: 0.5mm;
          text-transform: lowercase;
        }
        .kartu-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2mm 4mm 1.2mm;
        }
        .kartu-foto-placeholder {
          width: 18mm;
          height: 24mm;
          border-radius: 2.5mm;
          background: #F1F5F9;
          border: 0.2mm solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5mm;
          overflow: hidden;
          flex-shrink: 0;
        }
        .kartu-foto-icon {
          width: 10mm;
          height: 10mm;
          color: var(--abu);
        }
        .kartu-foto-img {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          border-radius: 2.3mm;
        }
        .kartu-nama {
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .kartu-nis {
          font-size: 7.5px;
          font-weight: 700;
          color: var(--abu);
          margin-top: 0.3mm;
        }
        .kartu-divider {
          width: 80%;
          border-top: 0.2mm solid #E2E8F0;
          margin: 1mm 0;
          flex-shrink: 0;
        }
        .kartu-info-row {
          display: flex;
          align-items: center;
          gap: 1.5mm;
          margin-top: 1.5mm;
        }
        .kartu-info-icon {
          width: 3.2mm;
          height: 3.2mm;
          color: var(--aksen);
          flex-shrink: 0;
        }
        .kartu-info-row span {
          font-size: 7.5px;
          color: #334155;
          max-width: 32mm;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kartu-ttl {
          font-size: 6.5px;
          color: #334155;
          text-align: center;
          margin-top: 0.35mm;
          line-height: 1.15;
          flex-shrink: 0;
        }
        .kartu-alamat {
          font-size: 6px;
          color: #334155;
          text-align: center;
          margin-top: 0.35mm;
          line-height: 1.15;
          flex-shrink: 0;
        }
        .kartu-footer {
          margin-top: auto;
          background: #F8FAFC;
          border-top: 0.2mm solid #E2E8F0;
          padding: 2.2mm 3mm 1.8mm;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 2mm;
          flex-shrink: 0;
        }
        .kartu-footer-text {
          min-width: 0;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .kartu-footer-label {
          font-size: 5.8px;
          color: var(--abu);
          line-height: 1.3;
        }
        .kartu-footer-sekolah {
          font-size: 6.5px;
          font-weight: 700;
          color: var(--utama);
          line-height: 1.25;
          margin-top: 0.3mm;
          white-space: nowrap;
        }
        .kartu-footer-kanan {
          min-width: 0;
          text-align: right;
        }
        .kartu-footer-kontak {
          font-size: 5px;
          color: var(--abu);
          line-height: 1.3;
          margin-top: 0.3mm;
        }
        .kartu-qr-mini {
          width: 14.5mm;
          height: 14.5mm;
          object-fit: contain;
          flex-shrink: 0;
        }
        .kartu-ttd-blok {
          width: 16mm;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .kartu-ttd-jabatan {
          font-size: 5.8px;
          font-weight: 700;
          color: #334155;
          margin-top: 0.5mm;
          margin-bottom: 0.1mm;
        }
        .kartu-ttd-gambar {
          position: relative;
          width: 14mm;
          height: 9mm;
        }
        .kartu-cap-img {
          position: absolute;
          top: 0.3mm;
          left: -0.8mm;
          width: 8mm;
          height: 8mm;
          object-fit: contain;
          opacity: 0.85;
        }
        .kartu-ttd-img {
          position: absolute;
          top: 0;
          right: -0.5mm;
          width: 9mm;
          height: 8.5mm;
          object-fit: contain;
        }
        .kartu-ttd-nama {
          font-size: 6px;
          font-weight: 700;
          color: #334155;
          margin-top: 0.1mm;
          line-height: 1.2;
        }
        .kartu-ttd-nip {
          font-size: 5.5px;
          color: var(--abu);
          margin-top: 0.2mm;
        }
        .kartu-qr-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          color: #cbd5e1;
        }

        .kartu-body-belakang { padding-top: 4mm; justify-content: flex-start; }
        .kartu-ketentuan-judul {
          font-size: 8.5px;
          font-weight: 800;
          color: var(--aksen);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 1.2mm;
        }
        .kartu-ketentuan-list { text-align: left; width: 100%; }
        .kartu-ketentuan-item {
          display: flex;
          align-items: flex-start;
          gap: 1.5mm;
          margin-bottom: 1mm;
        }
        .kartu-ketentuan-dot {
          width: 2mm;
          height: 2mm;
          border-radius: 50%;
          background: var(--aksen);
          margin-top: 0.7mm;
          flex-shrink: 0;
        }
        .kartu-ketentuan-item span:last-child {
          font-size: 6.8px;
          color: #334155;
          line-height: 1.3;
        }
        .kartu-qr-besar {
          width: 28mm;
          height: 28mm;
          object-fit: contain;
          margin: auto 0 0;
        }
        .kartu-qr-kode {
          font-family: monospace;
          font-size: 7px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.03em;
          margin: 1.5mm 0 2mm;
        }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .kartu-grid { gap: 3mm; }
          .kartu { box-shadow: none; }
          .kartu, .kartu * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4 portrait; margin: 8mm; }
      `}</style>
    </div>
  );
}
