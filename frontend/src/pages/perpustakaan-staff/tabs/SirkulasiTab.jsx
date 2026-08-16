import { useState } from 'react';
import { BookOpen, Undo2, Search, CheckCircle2 } from 'lucide-react';
import QrCodeScanner from '../../../components/QrCodeScanner';
import api from '../../../api/axios';
import { fmtDMY } from '../../../utils/date';

const KONDISI_OPSI = [
  { value: 'baik', label: 'Baik' },
  { value: 'rusak', label: 'Rusak' },
  { value: 'hilang', label: 'Hilang' },
];

// Sirkulasi — meja pinjam/kembali. Scanner TETAP 1 komponen yang sama
// dipasang terus (tidak dibongkar-pasang tiap langkah, supaya kamera tidak
// perlu diinisialisasi ulang) — onDecode-nya diganti sesuai langkah yang
// sedang berjalan (scan buku dulu, baru scan peminjam untuk mode Pinjam).
// Peminjam bisa SISWA atau GURU (relasi polimorfik di backend) — 1 kotak
// scan/cari yang sama dipakai untuk keduanya, dibedakan lewat field "tipe".
export default function SirkulasiTab() {
  const [mode, setMode] = useState('pinjam'); // 'pinjam' | 'kembali'
  const [step, setStep] = useState('scan-buku'); // scan-buku | scan-peminjam | konfirmasi | proses
  const [buku, setBuku] = useState(null); // { id, kode_eksemplar, status, buku: {...}, peminjaman_aktif? }
  const [peminjam, setPeminjam] = useState(null); // { id, tipe, user, nis?/nip?, classRoom?, rekap }
  const [kondisi, setKondisi] = useState('baik');
  const [kodeManual, setKodeManual] = useState('');
  const [cariNama, setCariNama] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sukses, setSukses] = useState('');

  const resetSemua = (modeBaru) => {
    setMode(modeBaru ?? mode);
    setStep('scan-buku');
    setBuku(null);
    setPeminjam(null);
    setKondisi('baik');
    setKodeManual('');
    setCariNama('');
    setHasilCari([]);
    setSukses('');
  };

  const scanBuku = async (kode) => {
    try {
      const res = await api.get(`/perpustakaan-sirkulasi/buku/${kode}`);
      if (mode === 'pinjam' && res.data.status !== 'tersedia') {
        return { error: true, message: `Eksemplar ini berstatus "${res.data.status}", tidak bisa dipinjamkan.` };
      }
      if (mode === 'kembali' && res.data.status !== 'dipinjam') {
        return { error: true, message: 'Eksemplar ini sedang tidak dalam status dipinjam.' };
      }
      setBuku(res.data);
      setStep(mode === 'pinjam' ? 'scan-peminjam' : 'proses');
      return { error: false, message: `Buku ditemukan: ${res.data.buku.judul}` };
    } catch (err) {
      return { error: true, message: err.response?.data?.message || 'Kode QR tidak dikenali.' };
    }
  };

  const scanPeminjam = async (kode) => {
    try {
      const res = await api.get(`/perpustakaan-sirkulasi/peminjam/kode/${kode}`);
      setPeminjam(res.data);
      setStep('konfirmasi');
      return { error: false, message: `${res.data.tipe === 'guru' ? 'Guru' : 'Siswa'} ditemukan: ${res.data.user.name}` };
    } catch (err) {
      return { error: true, message: err.response?.data?.message || 'QR Code/NIS/NIP tidak dikenali.' };
    }
  };

  const handleDecode = (kode) => (step === 'scan-peminjam' ? scanPeminjam(kode) : scanBuku(kode));

  const handleManual = async () => {
    if (!kodeManual.trim()) return;
    await handleDecode(kodeManual.trim());
    setKodeManual('');
  };

  const handleCariNama = async (q) => {
    setCariNama(q);
    if (q.trim().length < 2) { setHasilCari([]); return; }
    const res = await api.get('/perpustakaan-sirkulasi/peminjam/cari', { params: { q } });
    setHasilCari(res.data);
  };

  const pilihPeminjamDariCari = (p) => {
    setPeminjam({ ...p, rekap: p.rekap ?? { aktif: 0, terlambat: 0, riwayat_total: 0 } });
    setStep('konfirmasi');
    setHasilCari([]);
    setCariNama('');
    // Ambil rekap lengkap lewat id+tipe yang SUDAH PASTI benar dari hasil
    // cari — BUKAN lewat NIS/NIP (kode bisa ambigu, kalau kebetulan NIS
    // siswa lain sama dengan NIP guru ini, cariPeminjamByKode akan
    // menimpa pilihan dengan orang yang salah). Endpoint ini balikin
    // daftar peminjaman LENGKAP (bukan rekap ringkas), jadi angkanya
    // dihitung sendiri di sini dari daftar itu.
    api.get(`/perpustakaan-peminjaman/${p.tipe}/${p.id}`)
      .then((res) => {
        const daftar = res.data.peminjaman ?? [];
        const rekap = {
          aktif: daftar.filter((x) => x.status === 'dipinjam').length,
          terlambat: daftar.filter((x) => x.terlambat).length,
          riwayat_total: daftar.length,
        };
        setPeminjam({ ...p, rekap });
      })
      .catch(() => {});
  };

  const konfirmasiPinjam = async () => {
    setSubmitting(true);
    try {
      await api.post('/perpustakaan-sirkulasi/pinjam', { eksemplar_id: buku.id, peminjam_type: peminjam.tipe, peminjam_id: peminjam.id });
      setSukses(`"${buku.buku.judul}" berhasil dipinjamkan ke ${peminjam.user.name}.`);
      setTimeout(() => resetSemua(), 1800);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses peminjaman.');
    } finally {
      setSubmitting(false);
    }
  };

  const konfirmasiKembali = async () => {
    setSubmitting(true);
    try {
      await api.post(`/perpustakaan-sirkulasi/${buku.peminjaman_aktif.id}/kembalikan`, { kondisi });
      setSukses(`Pengembalian "${buku.buku.judul}" berhasil diproses (kondisi: ${kondisi}).`);
      setTimeout(() => resetSemua(), 1800);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses pengembalian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => resetSemua('pinjam')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'pinjam' ? 'bg-brand-600 text-white' : 'bg-white border border-line-200 text-ink-500'}`}
        >
          <BookOpen className="w-4 h-4" /> Peminjaman
        </button>
        <button
          onClick={() => resetSemua('kembali')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'kembali' ? 'bg-brand-600 text-white' : 'bg-white border border-line-200 text-ink-500'}`}
        >
          <Undo2 className="w-4 h-4" /> Pengembalian
        </button>
      </div>

      {sukses && (
        <div className="surface-card p-4 flex items-center gap-2 border-l-4 border-l-brand-500">
          <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-800 font-medium">{sukses}</p>
        </div>
      )}

      {!sukses && step === 'scan-peminjam' && buku && (
        <div className="surface-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-mist-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-ink-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate">{buku.buku.judul}</p>
            <p className="text-xs text-ink-500 truncate">{buku.buku.penulis || 'Penulis tidak diketahui'} · <span className="font-mono">{buku.kode_eksemplar}</span></p>
          </div>
        </div>
      )}

      {!sukses && (step === 'scan-buku' || step === 'scan-peminjam') && (
        <div className="surface-card p-4">
          <p className="text-sm font-semibold text-ink-900 mb-3">
            {step === 'scan-buku' ? 'Scan QR Buku' : 'Scan / Cari Peminjam (Siswa/Guru)'}
          </p>
          <QrCodeScanner onDecode={handleDecode} />
          <div className="flex gap-2 mt-3">
            <input
              value={kodeManual} onChange={(e) => setKodeManual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManual()}
              placeholder={step === 'scan-buku' ? 'Atau ketik kode QR...' : 'Atau ketik kode QR/NIS/NIP...'}
              className="field-input text-sm flex-1"
            />
            <button onClick={handleManual} className="btn-primary px-4">Cari</button>
          </div>

          {step === 'scan-peminjam' && (
            <div className="mt-4 pt-4 border-t border-line-200">
              <label className="field-label flex items-center gap-1.5 mb-1.5"><Search className="w-3.5 h-3.5" /> Cari nama siswa/guru</label>
              <input
                value={cariNama} onChange={(e) => handleCariNama(e.target.value)}
                placeholder="Ketik minimal 2 huruf..." className="field-input text-sm"
              />
              {hasilCari.length > 0 && (
                <ul className="mt-2 divide-y divide-line-200 border border-line-200 rounded-lg overflow-hidden">
                  {hasilCari.map((p) => (
                    <li key={`${p.tipe}-${p.id}`}>
                      <button onClick={() => pilihPeminjamDariCari(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-mist-50 flex items-center gap-2">
                        <span className={`badge-soft ${p.tipe === 'guru' ? 'badge-honey' : 'badge-brand'} shrink-0`}>{p.tipe === 'guru' ? 'Guru' : 'Siswa'}</span>
                        <span className="min-w-0">
                          <span className="font-medium text-ink-900">{p.user.name}</span>
                          <span className="text-ink-500"> — {p.tipe === 'guru' ? p.nip : `${p.nis} · ${p.class_room?.name}`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!sukses && step === 'konfirmasi' && buku && peminjam && (
        <div className="space-y-3">
          <div className="surface-card p-4">
            <p className="field-label mb-2">Buku Terpindai</p>
            <p className="font-semibold text-ink-900">{buku.buku.judul}</p>
            <p className="text-xs text-ink-500">{buku.buku.penulis} · <span className="font-mono">{buku.kode_eksemplar}</span></p>
          </div>
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="field-label">Peminjam</p>
              <span className={`badge-soft ${peminjam.tipe === 'guru' ? 'badge-honey' : 'badge-brand'}`}>{peminjam.tipe === 'guru' ? 'Guru' : 'Siswa'}</span>
            </div>
            <p className="font-semibold text-ink-900">{peminjam.user.name}</p>
            <p className="text-xs text-ink-500 mb-3">{peminjam.tipe === 'guru' ? peminjam.nip : `${peminjam.nis} · ${peminjam.class_room?.name}`}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-mist-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-display font-bold text-ink-900">{peminjam.rekap?.aktif ?? 0}</p>
                <p className="text-[11px] text-ink-500">Sedang pinjam</p>
              </div>
              <div className="bg-mist-50 rounded-lg p-2.5 text-center">
                <p className={`text-lg font-display font-bold ${(peminjam.rekap?.terlambat ?? 0) > 0 ? 'text-rose-700' : 'text-ink-900'}`}>{peminjam.rekap?.terlambat ?? 0}</p>
                <p className="text-[11px] text-ink-500">Terlambat</p>
              </div>
              <div className="bg-mist-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-display font-bold text-ink-900">{peminjam.rekap?.riwayat_total ?? 0}</p>
                <p className="text-[11px] text-ink-500">Riwayat total</p>
              </div>
            </div>
          </div>
          <button onClick={konfirmasiPinjam} disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? 'Memproses...' : 'Pinjamkan Buku'}
          </button>
          <button onClick={() => resetSemua()} className="w-full text-sm text-ink-500 hover:text-ink-700 py-1">Batal</button>
        </div>
      )}

      {!sukses && step === 'proses' && buku && (
        <div className="space-y-3">
          <div className="surface-card p-4">
            <p className="field-label mb-2">Info Peminjaman</p>
            <p className="font-semibold text-ink-900">{buku.buku.judul}</p>
            <p className="text-xs text-ink-500 mb-2">{buku.peminjaman_aktif?.peminjam?.user?.name}</p>
            <div className="flex items-center gap-2 text-xs text-ink-600">
              <span>Pinjam: {fmtDMY(buku.peminjaman_aktif?.tanggal_pinjam)}</span>
              <span>·</span>
              <span>Jatuh tempo: {fmtDMY(buku.peminjaman_aktif?.tanggal_jatuh_tempo)}</span>
            </div>
            {buku.peminjaman_aktif?.terlambat && (
              <span className="badge-soft badge-rose mt-2 inline-block">Terlambat {buku.peminjaman_aktif.hari_terlambat} hari</span>
            )}
          </div>
          <div className="surface-card p-4">
            <p className="field-label mb-2">Kondisi Buku Saat Kembali</p>
            <div className="flex gap-2">
              {KONDISI_OPSI.map((k) => (
                <button
                  key={k.value} onClick={() => setKondisi(k.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${kondisi === k.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-line-200 text-ink-700'}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={konfirmasiKembali} disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? 'Memproses...' : 'Proses Pengembalian'}
          </button>
          <button onClick={() => resetSemua()} className="w-full text-sm text-ink-500 hover:text-ink-700 py-1">Batal</button>
        </div>
      )}
    </div>
  );
}
