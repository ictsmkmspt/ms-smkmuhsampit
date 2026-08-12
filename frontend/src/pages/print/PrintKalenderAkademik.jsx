import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import api from '../../api/axios';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import { fmtDMY } from '../../utils/date';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

const JENIS_LABEL = {
  semester_ganjil: 'Semester Ganjil', semester_genap: 'Semester Genap',
  asts: 'ASTS', asas: 'ASAS', lainnya: 'Lainnya',
};
const JENIS_WARNA = {
  semester_ganjil: '#2A78D6', semester_genap: '#3FB27F',
  asts: '#D9A52A', asas: '#B9504F', lainnya: '#6B7280',
};

const pad2 = (n) => String(n).padStart(2, '0');

// Bulan yang dicetak mengikuti rentang tanggal tahun ajaran aktif (kalau
// sudah diisi di menu Kalender Akademik) — supaya kalender cetak benar-benar
// mencakup 1 tahun ajaran penuh, bukan cuma Januari-Desember kalender biasa.
function daftarBulan(tahunAjaran) {
  if (tahunAjaran?.tanggal_mulai && tahunAjaran?.tanggal_selesai) {
    const mulai = new Date(tahunAjaran.tanggal_mulai);
    const selesai = new Date(tahunAjaran.tanggal_selesai);
    const list = [];
    let y = mulai.getFullYear();
    let m = mulai.getMonth() + 1;
    const akhirY = selesai.getFullYear();
    const akhirM = selesai.getMonth() + 1;
    while (y < akhirY || (y === akhirY && m <= akhirM)) {
      list.push({ bulan: m, tahun: y });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return list;
  }
  const tahunSekarang = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, tahun: tahunSekarang }));
}

// Cek apakah tanggal2 adalah "hari kerja berikutnya" setelah tanggal1 —
// boleh melompati Sabtu/Minggu (itu otomatis libur juga), tapi TIDAK boleh
// melompati hari kerja biasa. Dipakai buat menggabungkan rentang libur yang
// sebenarnya 1 periode sama (mis. dibuat lewat "Tambah Rentang Hari Libur")
// tapi tersimpan sebagai baris terpisah per tanggal di database.
function keFormatTanggal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

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
function kelompokkanLibur(holidays) {
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

// Sabtu/Minggu otomatis dianggap libur, sama seperti di kalender interaktif
// (dan proses alpa di backend) — tidak perlu dicatat manual satu-satu.
function isLibur(tanggal, holidaySet) {
  if (holidaySet.has(tanggal)) return true;
  const [y, m, d] = tanggal.split('-').map(Number);
  const hari = new Date(y, m - 1, d).getDay();
  return hari === 0 || hari === 6;
}

function MiniBulan({ bulan, tahun, events, holidaySet }) {
  const jumlahHari = new Date(tahun, bulan, 0).getDate();
  const hariPertamaJs = new Date(tahun, bulan - 1, 1).getDay();
  const leading = (hariPertamaJs + 6) % 7;
  const sel = [];
  for (let i = 0; i < leading; i++) sel.push(null);
  for (let d = 1; d <= jumlahHari; d++) sel.push(d);
  while (sel.length % 7 !== 0) sel.push(null);

  const eventsForDay = (tanggal) => events.filter((ev) => ev.tanggal_mulai <= tanggal && tanggal <= ev.tanggal_selesai);

  return (
    <div className="border border-ink-300 rounded p-1.5 break-inside-avoid">
      <p className="text-center font-bold text-[10px] mb-1">{NAMA_BULAN[bulan - 1]} {tahun}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {NAMA_HARI.map((h, i) => (
              <th key={i} className="text-[7px] font-medium text-ink-500 pb-0.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: sel.length / 7 }, (_, minggu) => (
            <tr key={minggu}>
              {sel.slice(minggu * 7, minggu * 7 + 7).map((d, i) => {
                if (!d) return <td key={i} className="h-4" />;
                const tanggal = `${tahun}-${pad2(bulan)}-${pad2(d)}`;
                const libur = isLibur(tanggal, holidaySet);
                const dayEvents = eventsForDay(tanggal);
                return (
                  <td key={i} className={`text-center align-top h-4 ${libur ? 'bg-rose-100' : ''}`}>
                    <span className="text-[8px] leading-none">{d}</span>
                    {dayEvents.length > 0 && (
                      <span className="flex justify-center gap-px mt-px">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span key={ev.id} className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: JENIS_WARNA[ev.jenis] }} />
                        ))}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrintKalenderAkademik() {
  const { profile } = useSchoolProfile();

  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [tahunAjaran, setTahunAjaran] = useState(null);

  useEffect(() => {
    api.get('/academic-events').then((res) => setEvents(res.data));
    api.get('/holidays').then((res) => setHolidays(res.data));
    api.get('/tahun-ajaran').then((res) => setTahunAjaran(res.data.find((t) => t.status === 'aktif')));
  }, []);

  const holidaySet = new Set(holidays.map((h) => h.date));
  const bulanList = daftarBulan(tahunAjaran);

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white text-ink-900">
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Printer className="w-4 h-4" /> Print / Simpan PDF
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-lg font-bold uppercase tracking-wide">{profile.nama_sekolah}</h1>
        <h2 className="text-base font-bold uppercase tracking-wide mt-1">Kalender Akademik</h2>
        <p className="text-sm mt-1">{tahunAjaran ? `Tahun Ajaran ${tahunAjaran.nama}` : ''}</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {bulanList.map(({ bulan, tahun }) => (
          <MiniBulan key={`${tahun}-${bulan}`} bulan={bulan} tahun={tahun} events={events} holidaySet={holidaySet} />
        ))}
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2">Keterangan Warna</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(JENIS_LABEL).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: JENIS_WARNA[k] }} /> {l}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block bg-rose-200" /> Hari Libur
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2">Daftar Agenda</h3>
        {events.length === 0 ? (
          <p className="text-xs text-ink-400">Belum ada agenda akademik.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-ink-400 px-2 py-1 text-left">Nama Agenda</th>
                <th className="border border-ink-400 px-2 py-1">Jenis</th>
                <th className="border border-ink-400 px-2 py-1">Tanggal</th>
                <th className="border border-ink-400 px-2 py-1 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {[...events].sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai)).map((ev) => (
                <tr key={ev.id}>
                  <td className="border border-ink-300 px-2 py-1">{ev.nama}</td>
                  <td className="border border-ink-300 px-2 py-1 text-center">{JENIS_LABEL[ev.jenis]}</td>
                  <td className="border border-ink-300 px-2 py-1 text-center whitespace-nowrap">{fmtDMY(ev.tanggal_mulai)} – {fmtDMY(ev.tanggal_selesai)}</td>
                  <td className="border border-ink-300 px-2 py-1">{ev.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">Daftar Hari Libur</h3>
        {holidays.length === 0 ? (
          <p className="text-xs text-ink-400">Belum ada hari libur tercatat.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-ink-400 px-2 py-1">Tanggal</th>
                <th className="border border-ink-400 px-2 py-1 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {kelompokkanLibur(holidays).map((h) => (
                <tr key={h.id}>
                  <td className="border border-ink-300 px-2 py-1 text-center whitespace-nowrap">
                    {h.tanggal_mulai === h.tanggal_akhir ? fmtDMY(h.tanggal_mulai) : `${fmtDMY(h.tanggal_mulai)} – ${fmtDMY(h.tanggal_akhir)}`}
                  </td>
                  <td className="border border-ink-300 px-2 py-1">{h.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        @page { size: landscape; margin: 12mm; }
      `}</style>
    </div>
  );
}
