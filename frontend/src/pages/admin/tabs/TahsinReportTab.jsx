import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

/**
 * Rekap Tahsin — menu Laporan khusus Waka Kesiswaan, baca-saja. Ditampilkan
 * per siswa (bukan log datar): pilih kelas → tabel siswa dengan kolom
 * "Penilaian Terakhir" langsung kelihatan → klik "Detail" untuk lihat
 * seluruh riwayatnya. Sama pola dengan "Tabel Siswa" di menu Penilaian
 * guru, cuma di sini tanpa tombol tambah/edit/hapus.
 */
export default function TahsinReportTab() {
  const [classes, setClasses] = useState([]);
  const [kelasFilter, setKelasFilter] = useState('');
  const [roster, setRoster] = useState([]);
  const [classScores, setClassScores] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [siswaHistory, setSiswaHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { api.get('/classes').then((res) => setClasses(res.data)); }, []);

  // Ref penanda request siswa paling baru — kalau user klik "Detail" 2
  // siswa berturut-turut sebelum request pertama selesai, cegah respons
  // yang datang belakangan menimpa riwayat siswa yang sedang ditampilkan.
  const siswaReqRef = useRef(0);

  useEffect(() => {
    if (!kelasFilter) { setRoster([]); setClassScores([]); return; }
    let cancelled = false;
    setSelectedSiswa(null);
    setLoadingRoster(true);
    api.get('/students', { params: { class_room_id: kelasFilter } })
      .then((res) => { if (!cancelled) setRoster(res.data); })
      .finally(() => { if (!cancelled) setLoadingRoster(false); });
    api.get('/tahsin-scores', { params: { class_room_id: kelasFilter } }).then((res) => { if (!cancelled) setClassScores(res.data); });
    return () => { cancelled = true; };
  }, [kelasFilter]);

  const latestFor = useMemo(() => {
    const map = new Map();
    classScores.forEach((row) => {
      const current = map.get(row.student_id);
      if (!current || row.tanggal > current.tanggal || (row.tanggal === current.tanggal && row.id > current.id)) {
        map.set(row.student_id, row);
      }
    });
    return map;
  }, [classScores]);

  const selectSiswa = (s) => {
    setSelectedSiswa(s);
    setLoadingHistory(true);
    const reqId = ++siswaReqRef.current;
    api.get('/tahsin-scores', { params: { student_id: s.id } })
      .then((res) => { if (reqId === siswaReqRef.current) setSiswaHistory(res.data); })
      .finally(() => { if (reqId === siswaReqRef.current) setLoadingHistory(false); });
  };

  if (selectedSiswa) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedSiswa.user?.name}</h3>
            <p className="text-xs text-ink-500">{selectedSiswa.class_room?.name || '-'} &middot; NIS {selectedSiswa.nis}</p>
          </div>
          <button
            onClick={() => setSelectedSiswa(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar
          </button>
        </div>

        {loadingHistory ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat riwayat...</p>
        ) : siswaHistory.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada catatan Tahsin untuk siswa ini.</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {siswaHistory.map((row) => (
              <li key={row.id} className="py-2.5">
                <p className="text-sm text-ink-900">Jilid {row.jilid} &middot; Hal. {row.halaman}</p>
                <p className="text-xs text-ink-500">{row.tanggal}{row.keterangan ? ` · ${row.keterangan}` : ''}{row.recorded_by?.name ? ` · Dicatat oleh ${row.recorded_by.name}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
        <select value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)} className="field-input text-ink-700 text-sm max-w-xs">
          <option value="">— Pilih Kelas —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {!kelasFilter ? (
        <p className="text-sm text-ink-300 text-center py-8">Pilih kelas untuk melihat rekap Tahsin siswa.</p>
      ) : loadingRoster ? (
        <p className="text-sm text-ink-300 text-center py-8">Memuat...</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-ink-300 text-center py-8">Belum ada siswa di kelas ini.</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium whitespace-nowrap px-2">Penilaian Terakhir</th>
                <th className="whitespace-nowrap px-2"></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const last = latestFor.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2 text-ink-900"><TruncateText text={s.user?.name} /></td>
                    <td className="whitespace-nowrap px-2">
                      {last ? (
                        <span className="text-ink-700">Jilid {last.jilid} &middot; Hal. {last.halaman} <span className="text-xs text-ink-400">({last.tanggal})</span></span>
                      ) : (
                        <span className="text-xs text-ink-400">Belum ada catatan</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => selectSiswa(s)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
