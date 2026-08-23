import { useEffect, useRef, useState } from 'react';
import { Search, CheckCircle2, UserCheck, Clock } from 'lucide-react';
import QrCodeScanner from './QrCodeScanner';
import api from '../api/axios';

const KEPERLUAN_OPTIONS = ['Membaca/Belajar', 'Mengerjakan Tugas', 'Mengajar', 'Internet', 'Lainnya'];

/**
 * Form catat kunjungan (per orang — siswa ATAU guru) + riwayat hari ini,
 * dipakai bersama oleh Kunjungan Perpustakaan (Pustakawan) dan Kunjungan
 * Laboratorium (Kepala Bengkel ruang lab) — cuma beda `basePath`. Pola
 * scan/cari-manual/cari-nama meniru SirkulasiTab.jsx (Perpustakaan), tapi
 * di sini tidak ada langkah "scan buku" — begitu 1 orang ditemukan,
 * langsung tinggal pilih keperluan lalu catat.
 */
export default function KunjunganForm({ basePath }) {
  const [pengunjung, setPengunjung] = useState(null); // { id, tipe, user, ... }
  const [keperluan, setKeperluan] = useState('');
  const [keperluanLainnya, setKeperluanLainnya] = useState('');
  const [kodeManual, setKodeManual] = useState('');
  const [cariNama, setCariNama] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sukses, setSukses] = useState('');
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  const loadRiwayat = () => {
    setLoadingRiwayat(true);
    api.get(`${basePath}/hari-ini`).then((res) => setRiwayat(res.data)).finally(() => setLoadingRiwayat(false));
  };

  useEffect(() => { loadRiwayat(); }, [basePath]); // eslint-disable-line

  const resetForm = () => {
    setPengunjung(null);
    setKeperluan('');
    setKeperluanLainnya('');
    setKodeManual('');
    setCariNama('');
    setHasilCari([]);
    setSukses('');
  };

  const cariKode = async (kode) => {
    try {
      const res = await api.get(`${basePath}/cari/${encodeURIComponent(kode)}`);
      setPengunjung(res.data);
      setHasilCari([]);
      setCariNama('');
      return { error: false, message: `${res.data.tipe === 'guru' ? 'Guru' : 'Siswa'} ditemukan: ${res.data.user.name}` };
    } catch (err) {
      return { error: true, message: err.response?.data?.message || 'QR Code/NIS/NIP tidak dikenali.' };
    }
  };

  const handleManual = async () => {
    if (!kodeManual.trim()) return;
    await cariKode(kodeManual.trim());
    setKodeManual('');
  };

  const cariDebounceRef = useRef(null);
  const cariRequestIdRef = useRef(0);
  useEffect(() => () => { if (cariDebounceRef.current) clearTimeout(cariDebounceRef.current); }, []);

  const handleCariNama = (q) => {
    setCariNama(q);
    if (cariDebounceRef.current) clearTimeout(cariDebounceRef.current);
    if (q.trim().length < 2) { setHasilCari([]); return; }

    // Debounce 300ms (jangan 1 request per ketukan tombol) + penanda id
    // request supaya balasan yang lebih lambat dari query LAMA (mis. "ah")
    // tidak menimpa hasil query yang lebih baru dan lebih spesifik (mis.
    // "ahmad") kalau kebetulan datang belakangan karena jaringan.
    const requestId = ++cariRequestIdRef.current;
    cariDebounceRef.current = setTimeout(async () => {
      const res = await api.get(`${basePath}/cari`, { params: { q } }).catch(() => null);
      if (res && requestId === cariRequestIdRef.current) {
        setHasilCari(res.data);
      }
    }, 300);
  };

  const pilihDariCari = (p) => {
    setPengunjung(p);
    setHasilCari([]);
    setCariNama('');
  };

  const keperluanFinal = keperluan === 'Lainnya' ? keperluanLainnya.trim() : keperluan;

  const catatKunjungan = async () => {
    if (!pengunjung || !keperluanFinal) return;
    setSubmitting(true);
    try {
      await api.post(basePath, {
        pengunjung_type: pengunjung.tipe,
        pengunjung_id: pengunjung.id,
        keperluan: keperluanFinal,
      });
      setSukses(`Kunjungan ${pengunjung.user.name} berhasil dicatat.`);
      loadRiwayat();
      setTimeout(() => resetForm(), 1800);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat kunjungan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {sukses && (
        <div className="surface-card p-4 flex items-center gap-2 border-l-4 border-l-brand-500">
          <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-800 font-medium">{sukses}</p>
        </div>
      )}

      {!sukses && !pengunjung && (
        <div className="surface-card p-4">
          <p className="text-sm font-semibold text-ink-900 mb-3">Scan / Cari Pengunjung (Siswa/Guru)</p>
          <QrCodeScanner onDecode={cariKode} />
          <div className="flex gap-2 mt-3">
            <input
              value={kodeManual} onChange={(e) => setKodeManual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManual()}
              placeholder="Atau ketik kode QR/NIS/NIP..."
              className="field-input text-sm flex-1"
            />
            <button onClick={handleManual} className="btn-primary px-4">Cari</button>
          </div>

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
                    <button onClick={() => pilihDariCari(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-mist-50 flex items-center gap-2">
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
        </div>
      )}

      {!sukses && pengunjung && (
        <div className="surface-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-mist-50 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-ink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 truncate">{pengunjung.user.name}</p>
              <p className="text-xs text-ink-500 truncate">
                <span className={`badge-soft ${pengunjung.tipe === 'guru' ? 'badge-honey' : 'badge-brand'} mr-1.5`}>{pengunjung.tipe === 'guru' ? 'Guru' : 'Siswa'}</span>
                {pengunjung.tipe === 'guru' ? pengunjung.nip : `${pengunjung.nis} · ${pengunjung.class_room?.name || '-'}`}
              </p>
            </div>
          </div>

          <div>
            <label className="field-label mb-1.5 block">Keperluan</label>
            <div className="flex flex-wrap gap-1.5">
              {KEPERLUAN_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setKeperluan(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    keperluan === opt ? 'bg-brand-600 text-white' : 'bg-mist-50 text-ink-700 hover:bg-mist-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {keperluan === 'Lainnya' && (
              <input
                value={keperluanLainnya}
                onChange={(e) => setKeperluanLainnya(e.target.value)}
                placeholder="Tulis keperluan..."
                className="field-input text-sm mt-2 w-full"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={resetForm} className="text-sm px-4 py-2 text-ink-500 hover:text-ink-700">Batal</button>
            <button
              onClick={catatKunjungan}
              disabled={submitting || !keperluanFinal}
              className="btn-primary flex-1 justify-center"
            >
              {submitting ? 'Menyimpan...' : 'Catat Kunjungan'}
            </button>
          </div>
        </div>
      )}

      <div className="surface-card p-4">
        <h2 className="font-display font-semibold text-sm text-ink-900 mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-ink-400" /> Kunjungan Hari Ini
        </h2>
        {loadingRiwayat ? (
          <p className="text-center text-ink-300 text-sm py-4">Memuat...</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {riwayat.map((k) => (
              <li key={k.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="text-ink-900 truncate">{k.pengunjung?.user?.name || '-'}</p>
                  <p className="text-xs text-ink-500">{k.keperluan}</p>
                </div>
                <span className={`badge-soft shrink-0 ${k.pengunjung_type === 'guru' ? 'badge-honey' : 'badge-brand'}`}>
                  {k.pengunjung_type === 'guru' ? 'Guru' : 'Siswa'}
                </span>
              </li>
            ))}
            {riwayat.length === 0 && (
              <li className="py-4 text-center text-sm text-ink-300">Belum ada kunjungan hari ini.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
