import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';

export const JENIS_LABEL = {
  semester_ganjil: 'Semester Ganjil', semester_genap: 'Semester Genap',
  asts: 'ASTS', asas: 'ASAS', lainnya: 'Lainnya',
};

export const JENIS_WARNA = {
  semester_ganjil: '#2A78D6', semester_genap: '#3FB27F',
  asts: '#D9A52A', asas: '#B9504F', lainnya: '#6B7280',
};

export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', "Jum'at", 'Sab', 'Min'];

const pad2 = (n) => String(n).padStart(2, '0');

// Tampilan tabel pakai dd-mm-yyyy (format tanggal Indonesia) — data
// tersimpan & dikirim ke API tetap format ISO (yyyy-mm-dd) seperti biasa,
// cuma tampilannya yang dibalik.
export const fmtDMY = (tanggalIso) => (tanggalIso ? tanggalIso.split('-').reverse().join('-') : '-');

function keFormatTanggal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Cek apakah tanggal2 adalah "hari kerja berikutnya" setelah tanggal1 —
// boleh melompati Sabtu/Minggu (itu otomatis libur juga), tapi TIDAK boleh
// melompati hari kerja biasa. Dipakai buat menggabungkan rentang libur yang
// sebenarnya 1 periode sama tapi tersimpan sebagai baris terpisah per
// tanggal di database.
function hariKerjaBerikutnya(tanggal1, tanggal2) {
  const [y, m, tgl] = tanggal1.split('-').map(Number);
  const d = new Date(y, m - 1, tgl);
  d.setDate(d.getDate() + 1);
  while (keFormatTanggal(d) < tanggal2) {
    const hari = d.getDay();
    if (hari !== 0 && hari !== 6) return false;
    d.setDate(d.getDate() + 1);
  }
  return keFormatTanggal(d) === tanggal2;
}

// Gabungkan baris libur berurutan dengan keterangan sama jadi 1 rentang
// tanggal, supaya tabel Daftar Hari Libur tidak panjang mengulang teks yang
// sama (mis. "Libur Akhir Semester" 11 hari jadi 1 baris rentang).
export function kelompokkanLibur(holidays) {
  const urut = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const hasil = [];
  for (const h of urut) {
    const terakhir = hasil[hasil.length - 1];
    if (terakhir && terakhir.keterangan === h.keterangan && hariKerjaBerikutnya(terakhir.tanggal_akhir, h.date)) {
      terakhir.tanggal_akhir = h.date;
    } else {
      hasil.push({ id: h.id, tanggal_mulai: h.date, tanggal_akhir: h.date, keterangan: h.keterangan });
    }
  }
  return hasil;
}

// Sabtu/Minggu otomatis dianggap libur (sama seperti logika proses alpa di
// backend, Holiday::isHariLibur()) — tidak perlu dicatat manual satu-satu
// di Kalender Libur supaya tetap tampil di sini.
function cariLibur(tanggal, holidayMap) {
  const tercatat = holidayMap.get(tanggal);
  if (tercatat) return tercatat;
  const [y, m, d] = tanggal.split('-').map(Number);
  const hari = new Date(y, m - 1, d).getDay(); // 0=Minggu..6=Sabtu
  if (hari === 0) return { keterangan: 'Akhir Pekan (Minggu)' };
  if (hari === 6) return { keterangan: 'Akhir Pekan (Sabtu)' };
  return null;
}

// Grid kalender bulanan dengan agenda & hari libur ditandai — dipakai baik
// oleh tampilan kelola (Waka Kurikulum, bisa edit) maupun tampilan lihat-saja
// (siswa, wali, guru).
export default function AcademicAgendaCalendar({ events, holidays, showPrint = true }) {
  const sekarang = new Date();
  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [tahun, setTahun] = useState(sekarang.getFullYear());

  const gantiBulan = (delta) => {
    let b = bulan + delta; let t = tahun;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulan(b); setTahun(t);
  };

  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);

  const sel = useMemo(() => {
    const jumlahHari = new Date(tahun, bulan, 0).getDate();
    const hariPertamaJs = new Date(tahun, bulan - 1, 1).getDay(); // 0=Min..6=Sab
    const leading = (hariPertamaJs + 6) % 7; // 0=Sen..6=Min
    const sel = [];
    for (let i = 0; i < leading; i++) sel.push(null);
    for (let d = 1; d <= jumlahHari; d++) sel.push(d);
    while (sel.length % 7 !== 0) sel.push(null);
    return sel;
  }, [bulan, tahun]);

  const eventsForDay = (tanggal) => events.filter((ev) => ev.tanggal_mulai <= tanggal && tanggal <= ev.tanggal_selesai);

  return (
    <div className="surface-card p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display font-semibold text-ink-900">Kalender Agenda</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-mist-50 border border-line-200 rounded-xl px-1 py-1">
            <button onClick={() => gantiBulan(-1)} className="p-1.5 rounded-lg hover:bg-white text-ink-500"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-ink-700 px-2 whitespace-nowrap">{NAMA_BULAN[bulan - 1]} {tahun}</span>
            <button onClick={() => gantiBulan(1)} className="p-1.5 rounded-lg hover:bg-white text-ink-500"><ChevronRight className="w-4 h-4" /></button>
          </div>
          {showPrint && (
            <button
              onClick={() => window.open('/print/kalender-akademik', '_blank')}
              className="text-xs text-ink-600 hover:text-brand-700 font-medium border border-line-200 rounded-lg px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium text-ink-500 mb-1">
        {NAMA_HARI.map((h) => <div key={h} className="text-center py-1 truncate px-0.5">{h}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {sel.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[92px] sm:min-h-[76px] rounded-lg bg-mist-50/40" />;
          const tanggal = `${tahun}-${pad2(bulan)}-${pad2(d)}`;
          const holiday = cariLibur(tanggal, holidayMap);
          const dayEvents = eventsForDay(tanggal);
          return (
            <div key={i} className={`min-h-[92px] sm:min-h-[76px] rounded-lg border p-1 sm:p-1.5 ${holiday ? 'bg-rose-50 border-rose-200' : 'border-line-200'}`}>
              <p className={`text-[10px] sm:text-xs font-medium mb-1 ${holiday ? 'text-rose-700' : 'text-ink-700'}`}>{d}</p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <p key={ev.id} title={ev.nama} className="text-[8px] sm:text-[10px] leading-tight rounded px-1 py-0.5 text-white line-clamp-2 break-words" style={{ backgroundColor: JENIS_WARNA[ev.jenis] }}>
                    {ev.nama}
                  </p>
                ))}
                {dayEvents.length > 2 && <p className="text-[8px] sm:text-[10px] text-ink-400">+{dayEvents.length - 2} lagi</p>}
                {holiday && (
                  <p title={holiday.keterangan} className="text-[8px] sm:text-[10px] leading-tight rounded px-1 py-0.5 bg-rose-600 text-white line-clamp-2 break-words">
                    {holiday.keterangan}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-line-200">
        <p className="text-xs text-ink-500 mb-2">
          <b>Penjelasan:</b> label warna pada tanggal menunjukkan jenis agenda akademik yang berlangsung, sedangkan latar kuning menandai hari libur.
        </p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(JENIS_LABEL).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: JENIS_WARNA[k] }} /> {l}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-200" /> Hari Libur
          </span>
        </div>
      </div>
    </div>
  );
}
