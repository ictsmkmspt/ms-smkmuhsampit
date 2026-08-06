import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import api from '../api/axios';
import AgendaCalendar, { JENIS_LABEL, JENIS_WARNA, fmtDMY, kelompokkanLibur } from './AcademicAgendaCalendar';

const LIBUR_PER_HALAMAN = 10;

/**
 * Kalender Akademik versi lihat-saja — dipakai di menu Pembelajaran (Siswa
 * & Wali) dan Beranda Guru. Data & tampilannya sama seperti punya Waka
 * Kurikulum, cuma tanpa form tambah/hapus agenda atau edit tanggal tahun
 * ajaran.
 */
export default function KalenderAkademikView() {
  const [tahunAjaranAktif, setTahunAjaranAktif] = useState(null);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [halamanLibur, setHalamanLibur] = useState(1);

  useEffect(() => {
    api.get('/tahun-ajaran').then((res) => setTahunAjaranAktif(res.data.find((t) => t.status === 'aktif') || null));
    api.get('/academic-events').then((res) => setEvents(res.data));
    api.get('/holidays').then((res) => setHolidays(res.data));
  }, []);

  const liburDikelompokkan = useMemo(() => kelompokkanLibur(holidays).reverse(), [holidays]);
  const totalHalamanLibur = Math.max(1, Math.ceil(liburDikelompokkan.length / LIBUR_PER_HALAMAN));
  const liburHalamanIni = liburDikelompokkan.slice((halamanLibur - 1) * LIBUR_PER_HALAMAN, halamanLibur * LIBUR_PER_HALAMAN);

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <CalendarRange className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Tahun ajaran aktif{tahunAjaranAktif ? <> <b>{tahunAjaranAktif.nama}</b>{tahunAjaranAktif.tanggal_mulai && tahunAjaranAktif.tanggal_selesai ? <>, {fmtDMY(tahunAjaranAktif.tanggal_mulai)} – {fmtDMY(tahunAjaranAktif.tanggal_selesai)}</> : ' (tanggal belum diatur)'}</> : ': belum ada.'}
        </p>
      </div>

      <AgendaCalendar events={events} holidays={holidays} showPrint={false} />

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Agenda <span className="text-ink-500 font-sans font-normal text-sm">({events.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Jenis</th>
              <th className="font-medium whitespace-nowrap px-2">Tanggal</th>
              <th className="font-medium whitespace-nowrap px-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-line-200">
                <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{ev.nama}</td>
                <td className="whitespace-nowrap px-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: JENIS_WARNA[ev.jenis] }}>
                    {JENIS_LABEL[ev.jenis]}
                  </span>
                </td>
                <td className="text-ink-700 font-mono whitespace-nowrap px-2">{fmtDMY(ev.tanggal_mulai)} – {fmtDMY(ev.tanggal_selesai)}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{ev.keterangan || '-'}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada agenda untuk tahun ajaran aktif.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Daftar Hari Libur</h2>
        <p className="text-xs text-ink-500 mb-4">
          Tanggal yang tersorot merah di kalender di atas adalah hari libur — daftarnya berikut ini, terbaru lebih dulu. Rentang tanggal berurutan dengan keterangan sama digabung jadi 1 baris.
        </p>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium w-48 whitespace-nowrap px-2">Tanggal</th>
              <th className="font-medium whitespace-nowrap px-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {liburHalamanIni.map((h) => (
              <tr key={h.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-ink-900 whitespace-nowrap px-2">
                  {h.tanggal_mulai === h.tanggal_akhir ? fmtDMY(h.tanggal_mulai) : `${fmtDMY(h.tanggal_mulai)} – ${fmtDMY(h.tanggal_akhir)}`}
                </td>
                <td className="text-ink-700 whitespace-nowrap px-2">{h.keterangan}</td>
              </tr>
            ))}
            {holidays.length === 0 && <tr><td colSpan="2" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada hari libur tercatat.</td></tr>}
          </tbody>
        </table>
        </div>
        {liburDikelompokkan.length > LIBUR_PER_HALAMAN && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-ink-500 mr-2">Halaman {halamanLibur} dari {totalHalamanLibur}</span>
            <button
              onClick={() => setHalamanLibur((p) => Math.max(1, p - 1))}
              disabled={halamanLibur === 1}
              className="flex items-center gap-1 text-xs font-medium text-ink-600 border border-line-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setHalamanLibur((p) => Math.min(totalHalamanLibur, p + 1))}
              disabled={halamanLibur === totalHalamanLibur}
              className="flex items-center gap-1 text-xs font-medium text-ink-600 border border-line-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
