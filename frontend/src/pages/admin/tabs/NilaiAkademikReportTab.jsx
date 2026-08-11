import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

/**
 * Rekap Nilai Akademik — menu Laporan khusus Waka Kurikulum, baca-saja.
 * 4 tingkat: daftar Kelas → detail Kelas menampilkan rekap tiap Mapel
 * (rerata/tertinggi/terendah) → tombol "Detail Kegiatan" membuka daftar
 * kegiatan (nama_kegiatan + tanggal) yang sudah diinput guru untuk mapel
 * itu → klik 1 kegiatan menampilkan nilai tiap siswa di kegiatan tersebut.
 *
 * Semua nilai 1 kelas diambil sekali (tanpa filter subject_id) saat kelas
 * dipilih, lalu tiap tingkat berikutnya cuma menyaring data itu di memori
 * — tidak perlu request baru tiap pindah mapel/kegiatan.
 */
export default function NilaiAkademikReportTab() {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedKelas, setSelectedKelas] = useState(null);
  const [classScores, setClassScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  const [selectedMapel, setSelectedMapel] = useState(null);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);

  // Menandai request kelas paling baru, supaya kalau user klik Detail 2
  // kelas berturut-turut sebelum request pertama selesai, respons yang
  // datang belakangan (bukan yang diklik terakhir) tidak menimpa data yang
  // sedang ditampilkan.
  const requestIdRef = useRef(0);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).finally(() => setLoadingClasses(false));
  }, []);

  const bukaKelas = (c) => {
    setSelectedKelas(c);
    setSelectedMapel(null);
    setSelectedKegiatan(null);
    setLoadingScores(true);
    const requestId = ++requestIdRef.current;
    api.get('/academic-scores/laporan', { params: { class_room_id: c.id } })
      .then((res) => {
        if (requestId === requestIdRef.current) setClassScores(res.data);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoadingScores(false);
      });
  };

  const mapelStats = useMemo(() => {
    const map = new Map();
    classScores.forEach((s) => {
      if (!s.subject) return;
      if (!map.has(s.subject.id)) map.set(s.subject.id, { subject: s.subject, nilai: [] });
      map.get(s.subject.id).nilai.push(s.skor);
    });
    return [...map.values()]
      .map(({ subject, nilai }) => ({
        subject,
        rerata: (nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(1),
        tertinggi: Math.max(...nilai),
        terendah: Math.min(...nilai),
        jumlah: nilai.length,
      }))
      .sort((a, b) => a.subject.nama.localeCompare(b.subject.nama));
  }, [classScores]);

  const kegiatanMapel = useMemo(() => {
    if (!selectedMapel) return [];
    const map = new Map();
    classScores.filter((s) => s.subject?.id === selectedMapel.id).forEach((s) => {
      const key = `${s.tanggal}||${s.nama_kegiatan}`;
      if (!map.has(key)) map.set(key, { tanggal: s.tanggal, nama_kegiatan: s.nama_kegiatan, nilai: [] });
      map.get(key).nilai.push(s.skor);
    });
    return [...map.values()]
      .map((k) => ({ ...k, rerata: (k.nilai.reduce((a, b) => a + b, 0) / k.nilai.length).toFixed(1), jumlah: k.nilai.length }))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  }, [classScores, selectedMapel]);

  const siswaKegiatan = useMemo(() => {
    if (!selectedMapel || !selectedKegiatan) return [];
    return classScores
      .filter((s) => s.subject?.id === selectedMapel.id && s.tanggal === selectedKegiatan.tanggal && s.nama_kegiatan === selectedKegiatan.nama_kegiatan)
      .slice()
      .sort((a, b) => (a.student?.user?.name || '').localeCompare(b.student?.user?.name || ''));
  }, [classScores, selectedMapel, selectedKegiatan]);

  // Tingkat 4: siswa dalam 1 kegiatan
  if (selectedMapel && selectedKegiatan) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedKegiatan.nama_kegiatan}</h3>
            <p className="text-xs text-ink-500">{selectedKelas.name} &middot; {selectedMapel.nama} &middot; {selectedKegiatan.tanggal}</p>
          </div>
          <button
            onClick={() => setSelectedKegiatan(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Kegiatan
          </button>
        </div>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium text-right whitespace-nowrap px-2">Skor</th>
              </tr>
            </thead>
            <tbody>
              {siswaKegiatan.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={s.student?.user?.name} /></td>
                  <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{s.skor}</td>
                </tr>
              ))}
              {siswaKegiatan.length === 0 && (
                <tr><td colSpan="2" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada nilai.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tingkat 3: daftar kegiatan dalam 1 mapel
  if (selectedMapel) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedMapel.nama}</h3>
            <p className="text-xs text-ink-500">{selectedKelas.name} &middot; Daftar Kegiatan</p>
          </div>
          <button
            onClick={() => setSelectedMapel(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Mapel
          </button>
        </div>
        {kegiatanMapel.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-8">Belum ada kegiatan nilai untuk mapel ini.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Kegiatan</th>
                  <th className="font-medium whitespace-nowrap px-2">Tanggal</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Jumlah Siswa</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Rerata</th>
                  <th className="whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {kegiatanMapel.map((k) => (
                  <tr key={`${k.tanggal}||${k.nama_kegiatan}`} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={k.nama_kegiatan} maxWidth="14rem" /></td>
                    <td className="text-ink-500 text-xs whitespace-nowrap px-2">{k.tanggal}</td>
                    <td className="text-right text-ink-700 whitespace-nowrap px-2">{k.jumlah}</td>
                    <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{k.rerata}</td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => setSelectedKegiatan(k)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Tingkat 2: rekap mapel dalam 1 kelas
  if (selectedKelas) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedKelas.name}</h3>
            <p className="text-xs text-ink-500">Rekap Nilai per Mata Pelajaran</p>
          </div>
          <button
            onClick={() => setSelectedKelas(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
          </button>
        </div>
        {loadingScores ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : mapelStats.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-8">Belum ada nilai tercatat untuk kelas ini.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Mata Pelajaran</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Rerata</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Tertinggi</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Terendah</th>
                  <th className="whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {mapelStats.map((m) => (
                  <tr key={m.subject.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={m.subject.nama} /></td>
                    <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{m.rerata}</td>
                    <td className="text-right text-emerald-600 whitespace-nowrap px-2">{m.tertinggi}</td>
                    <td className="text-right text-rose-600 whitespace-nowrap px-2">{m.terendah}</td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => setSelectedMapel(m.subject)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Detail Kegiatan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Tingkat 1: daftar kelas
  return (
    <div className="surface-card p-5">
      <h2 className="font-display font-semibold text-ink-900 mb-1">Rekap Nilai Akademik</h2>
      <p className="text-xs text-ink-500 mb-4">Pilih kelas untuk lihat rekap nilainya per mata pelajaran.</p>
      {loadingClasses ? (
        <p className="text-center text-ink-300 py-6">Memuat...</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-ink-300 text-center py-8">Belum ada kelas.</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Kelas</th>
                <th className="whitespace-nowrap px-2"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{c.name}</td>
                  <td className="text-right whitespace-nowrap px-2">
                    <button onClick={() => bukaKelas(c)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
