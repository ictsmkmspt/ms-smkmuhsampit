import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fmtDMY } from '../utils/date';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', "Jum'at", 'Sab', 'Min'];
const pad2 = (n) => String(n).padStart(2, '0');

const bulanIni = new Date().getMonth() + 1;
const tahunIni = new Date().getFullYear();
// Rentang tahun di dropdown cukup lebar buat menutupi tanggal lahir (siswa,
// guru, dst) sampai perencanaan ke depan (kalender akademik, PKL) — jauh
// lebih cepat daripada klik panah bulan satu-satu puluhan kali.
const DAFTAR_TAHUN = Array.from({ length: 100 }, (_, i) => tahunIni + 10 - i);

/**
 * Pengganti <input type="date"> — kalender bawaan browser ikut locale
 * OS/browser pengguna dan tidak bisa dipaksa tampil dd-mm-yyyy dari kode,
 * jadi dibuat kalender sendiri. Kontrak value/onChange TETAP sama seperti
 * input asli (value = ISO yyyy-mm-dd, onChange dipanggil dengan objek
 * mirip event `{ target: { value } }`) supaya jadi pengganti langsung
 * tanpa ubah handler yang sudah ada di pemanggilnya.
 */
export default function DateInput({ value, onChange, className = '', required = false, disabled = false, placeholder = 'dd-mm-yyyy', id, min, max }) {
  const [open, setOpen] = useState(false);
  const [viewBulan, setViewBulan] = useState(() => (value ? Number(value.slice(5, 7)) : bulanIni));
  const [viewTahun, setViewTahun] = useState(() => (value ? Number(value.slice(0, 4)) : tahunIni));
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (value) {
      setViewBulan(Number(value.slice(5, 7)));
      setViewTahun(Number(value.slice(0, 4)));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const tutupKalauDiluar = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', tutupKalauDiluar);
    return () => document.removeEventListener('mousedown', tutupKalauDiluar);
  }, [open]);

  const gantiBulan = (delta) => {
    let b = viewBulan + delta; let t = viewTahun;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setViewBulan(b); setViewTahun(t);
  };

  const pilihHari = (d) => {
    onChange({ target: { value: `${viewTahun}-${pad2(viewBulan)}-${pad2(d)}` } });
    setOpen(false);
  };

  const keHariIni = () => {
    const iso = `${tahunIni}-${pad2(bulanIni)}-${pad2(new Date().getDate())}`;
    if ((min && iso < min) || (max && iso > max)) return;
    setViewBulan(bulanIni);
    setViewTahun(tahunIni);
    onChange({ target: { value: iso } });
    setOpen(false);
  };

  const hapusTanggal = (e) => {
    e.stopPropagation();
    onChange({ target: { value: '' } });
  };

  const jumlahHari = new Date(viewTahun, viewBulan, 0).getDate();
  const hariPertamaJs = new Date(viewTahun, viewBulan - 1, 1).getDay(); // 0=Min..6=Sab
  const leading = (hariPertamaJs + 6) % 7; // 0=Sen..6=Min
  const sel = [];
  for (let i = 0; i < leading; i++) sel.push(null);
  for (let d = 1; d <= jumlahHari; d++) sel.push(d);

  const isTerpilih = (d) => value === `${viewTahun}-${pad2(viewBulan)}-${pad2(d)}`;
  // Perbandingan string ISO yyyy-mm-dd aman diurutkan leksikografis sama
  // seperti diurutkan sebagai tanggal asli.
  const diluarRentang = (d) => {
    const iso = `${viewTahun}-${pad2(viewBulan)}-${pad2(d)}`;
    return (min && iso < min) || (max && iso > max);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={value ? 'text-ink-900' : 'text-ink-300'}>{value ? fmtDMY(value) : placeholder}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <X className="w-3.5 h-3.5 text-ink-300 hover:text-honey-700" onClick={hapusTanggal} />
          )}
          <Calendar className="w-4 h-4 text-ink-400" />
        </span>
      </button>

      {/* Proxy tersembunyi supaya validasi HTML5 `required` bawaan form tetap
          jalan (tombol di atas bukan input asli, jadi tidak otomatis ikut
          validasi) — ditumpuk pas di posisi tombol supaya bubble validasi
          browser muncul di tempat yang benar. SENGAJA bukan `readOnly`:
          atribut itu mengecualikan elemen dari constraint validation sama
          sekali (required jadi tidak pernah dicek) — dipakai onChange
          kosong sebagai gantinya, aman karena elemennya pointer-events-none
          jadi tidak bisa diketik pengguna. */}
      {required && (
        <input
          tabIndex={-1}
          value={value || ''}
          required
          onChange={() => {}}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      )}

      {open && !disabled && (
        <div className="absolute z-[60] mt-1 bg-white border border-line-200 rounded-xl shadow-lg p-3 w-64">
          <div className="flex items-center gap-1.5 mb-2">
            <button type="button" onClick={() => gantiBulan(-1)} className="p-1 rounded-lg hover:bg-mist-50 text-ink-500 shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={viewBulan}
              onChange={(e) => setViewBulan(Number(e.target.value))}
              className="flex-1 min-w-0 text-sm border border-line-200 rounded-lg px-1.5 py-1 text-ink-700"
            >
              {NAMA_BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </select>
            <select
              value={viewTahun}
              onChange={(e) => setViewTahun(Number(e.target.value))}
              className="text-sm border border-line-200 rounded-lg px-1.5 py-1 text-ink-700"
            >
              {DAFTAR_TAHUN.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" onClick={() => gantiBulan(1)} className="p-1 rounded-lg hover:bg-mist-50 text-ink-500 shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[10px] font-medium text-ink-400 mb-1">
            {NAMA_HARI.map((h) => <div key={h} className="text-center py-1">{h[0]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {sel.map((d, i) => {
              const nonaktif = !d || diluarRentang(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={nonaktif}
                  onClick={() => d && !nonaktif && pilihHari(d)}
                  className={`text-xs h-7 rounded-lg ${!d ? 'invisible' : nonaktif ? 'text-ink-300 cursor-not-allowed' : isTerpilih(d) ? 'bg-brand-600 text-white font-semibold' : 'text-ink-700 hover:bg-mist-100'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line-200">
            <button type="button" onClick={keHariIni} className="text-xs font-medium text-brand-700 hover:text-brand-800">
              Hari Ini
            </button>
            {value && (
              <button type="button" onClick={() => { onChange({ target: { value: '' } }); setOpen(false); }} className="text-xs font-medium text-ink-400 hover:text-honey-700">
                Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
